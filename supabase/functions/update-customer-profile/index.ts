import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UpdateRequest = {
  business_id: string;
  customer_phone?: string;
};

type CustomerAggregate = {
  customer_phone: string;
  total_orders: number;
  total_order_value: number;
  paid_orders: number;
  first_order_at?: string;
  last_order_at?: string;
  total_spent: number;
  velocity_days_total: number;
  velocity_count: number;
};

function getSegment(totalSpent: number) {
  if (totalSpent >= 50000) return "premium";
  if (totalSpent >= 10000) return "wholesale";
  return "retail";
}

function diffDays(start?: string, end?: string) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff / (1000 * 60 * 60 * 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<UpdateRequest>(req);
    const businessId = body.business_id;
    const customerPhone = body.customer_phone?.trim();

    if (!businessId) {
      throw new HttpError(400, "Missing business_id");
    }

    await ensureBusinessActive(businessId);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `customer-profile:${businessId}:${ipAddress}`,
      max: 10,
      windowMs: 60_000,
      businessId,
      action: "update-customer-profile",
      ipAddress,
      userAgent,
    });

    const supabase = getSupabaseClient();
    let ordersQuery = supabase
      .from("orders")
      .select(
        "id,customer_phone,total_amount,outstanding_amount,status,created_at",
      )
      .eq("business_id", businessId);

    if (customerPhone) {
      ordersQuery = ordersQuery.eq("customer_phone", customerPhone);
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) {
      throw new HttpError(500, "Failed to load orders", {
        message: ordersError.message,
      });
    }

    if (!orders || orders.length === 0) {
      return jsonResponse({ success: true, updated: 0 }, 200, corsHeaders);
    }

    const orderIds = orders.map((order) => order.id);
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("order_id,customer_phone,applied_amount,created_at,status")
      .eq("business_id", businessId)
      .in("order_id", orderIds)
      .eq("status", "confirmed");

    if (paymentsError) {
      throw new HttpError(500, "Failed to load payments", {
        message: paymentsError.message,
      });
    }

    const orderCustomerMap = new Map<string, string>();
    const orderCreatedMap = new Map<string, string>();
    for (const order of orders) {
      orderCustomerMap.set(order.id, order.customer_phone);
      orderCreatedMap.set(order.id, order.created_at);
    }

    const customerMap = new Map<string, CustomerAggregate>();
    for (const order of orders) {
      const phone = order.customer_phone;
      if (!phone) continue;
      const entry = customerMap.get(phone) ?? {
        customer_phone: phone,
        total_orders: 0,
        total_order_value: 0,
        paid_orders: 0,
        first_order_at: order.created_at,
        last_order_at: order.created_at,
        total_spent: 0,
        velocity_days_total: 0,
        velocity_count: 0,
      };

      entry.total_orders += 1;
      entry.total_order_value += Number(order.total_amount ?? 0);
      if (order.status === "paid") {
        entry.paid_orders += 1;
      }
      if (
        entry.first_order_at &&
        new Date(order.created_at) < new Date(entry.first_order_at)
      ) {
        entry.first_order_at = order.created_at;
      }
      if (
        entry.last_order_at &&
        new Date(order.created_at) > new Date(entry.last_order_at)
      ) {
        entry.last_order_at = order.created_at;
      }

      customerMap.set(phone, entry);
    }

    const orderPayments = new Map<string, { firstPayment?: string; total: number }>();
    for (const payment of payments ?? []) {
      const orderId = payment.order_id;
      if (!orderId) continue;
      const existing = orderPayments.get(orderId) ?? { total: 0 };
      const paymentDate = payment.created_at;
      if (!existing.firstPayment || new Date(paymentDate) < new Date(existing.firstPayment)) {
        existing.firstPayment = paymentDate;
      }
      existing.total += Number(payment.applied_amount ?? 0);
      orderPayments.set(orderId, existing);

      const phone = payment.customer_phone ?? orderCustomerMap.get(orderId);
      if (!phone) continue;
      const entry = customerMap.get(phone);
      if (entry) {
        entry.total_spent += Number(payment.applied_amount ?? 0);
      }
    }

    for (const [orderId, paymentInfo] of orderPayments.entries()) {
      const phone = orderCustomerMap.get(orderId);
      const orderCreatedAt = orderCreatedMap.get(orderId);
      if (!phone || !orderCreatedAt || !paymentInfo.firstPayment) continue;
      const entry = customerMap.get(phone);
      if (!entry) continue;
      const velocity = diffDays(orderCreatedAt, paymentInfo.firstPayment);
      if (velocity !== null) {
        entry.velocity_days_total += velocity;
        entry.velocity_count += 1;
      }
    }

    const profiles = Array.from(customerMap.values()).map((entry) => {
      const avgOrderValue = entry.total_orders > 0
        ? entry.total_order_value / entry.total_orders
        : null;
      const paymentVelocity = entry.velocity_count > 0
        ? entry.velocity_days_total / entry.velocity_count
        : null;
      const consistencyScore = entry.total_orders > 0
        ? entry.paid_orders / entry.total_orders
        : null;
      return {
        business_id: businessId,
        customer_phone: entry.customer_phone,
        total_spent: entry.total_spent,
        total_orders: entry.total_orders,
        avg_order_value: avgOrderValue,
        payment_velocity_days: paymentVelocity,
        payment_consistency_score: consistencyScore,
        segment: getSegment(entry.total_spent),
        first_order_at: entry.first_order_at ?? null,
        last_order_at: entry.last_order_at ?? null,
      };
    });

    const { error: upsertError } = await supabase
      .from("customer_financial_profiles")
      .upsert(profiles, {
        onConflict: "business_id,customer_phone",
      });

    if (upsertError) {
      throw new HttpError(500, "Failed to update customer profiles", {
        message: upsertError.message,
      });
    }

    return jsonResponse(
      {
        success: true,
        updated: profiles.length,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
