import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PartnerRequest = {
  business_id: string;
  action: "business_snapshot" | "customer_profile";
  customer_phone?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<PartnerRequest>(req);
    if (!body.business_id || !body.action) {
      throw new HttpError(400, "Missing business_id or action");
    }

    await ensureBusinessActive(body.business_id);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `partner-gateway:${body.business_id}:${ipAddress}`,
      max: 10,
      windowMs: 60_000,
      businessId: body.business_id,
      action: "partner-gateway",
      ipAddress,
      userAgent,
    });

    const supabase = getSupabaseClient();

    if (body.action === "business_snapshot") {
      const [{ data: metrics }, { data: orders }, { data: customers }] =
        await Promise.all([
          supabase
            .from("business_financial_metrics")
            .select("revenue_last_90_days,avg_daily_revenue,working_capital")
            .eq("business_id", body.business_id)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("id,total_amount")
            .eq("business_id", body.business_id),
          supabase
            .from("customer_financial_profiles")
            .select("customer_phone,total_orders,payment_velocity_days")
            .eq("business_id", body.business_id),
        ]);

      const totalOrders = orders?.length ?? 0;
      const totalRevenue = (orders ?? []).reduce(
        (sum, order) => sum + Number(order.total_amount ?? 0),
        0,
      );
      const avgOrderValue = totalOrders > 0
        ? totalRevenue / totalOrders
        : 0;

      const customerCount = customers?.length ?? 0;
      const repeatCustomers = (customers ?? []).filter((c) =>
        Number(c.total_orders ?? 0) > 1
      ).length;
      const repeatRate = customerCount > 0
        ? repeatCustomers / customerCount
        : 0;
      const paymentVelocity = (customers ?? [])
        .map((c) => Number(c.payment_velocity_days ?? 0))
        .filter((v) => v > 0);
      const avgVelocity = paymentVelocity.length > 0
        ? paymentVelocity.reduce((sum, v) => sum + v, 0) /
          paymentVelocity.length
        : 0;

      return jsonResponse(
        {
          revenue_last_90_days: Number(metrics?.revenue_last_90_days ?? 0),
          average_order_value: avgOrderValue,
          customer_count: customerCount,
          repeat_customer_rate: repeatRate,
          payment_velocity_days: avgVelocity,
          working_capital: Number(metrics?.working_capital ?? 0),
          format: "standard_financial_snapshot_v1",
          generated_at: new Date().toISOString(),
          validity_days: 7,
        },
        200,
        corsHeaders,
      );
    }

    if (body.action === "customer_profile") {
      if (!body.customer_phone) {
        throw new HttpError(400, "Missing customer_phone");
      }

      const { data: profile } = await supabase
        .from("customer_financial_profiles")
        .select("*")
        .eq("business_id", body.business_id)
        .eq("customer_phone", body.customer_phone)
        .maybeSingle();

      if (!profile) {
        throw new HttpError(404, "Customer profile not found");
      }

      return jsonResponse(
        {
          behavioral_data: {
            months_active: profile.first_order_at
              ? Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(profile.first_order_at).getTime()) /
                    (1000 * 60 * 60 * 24 * 30),
                ),
              )
              : 0,
            total_transactions: profile.total_orders ?? 0,
            total_volume: profile.total_spent ?? 0,
            average_transaction_size: profile.avg_order_value ?? 0,
            payment_punctuality: profile.payment_consistency_score ?? 0,
            credit_utilization_trend: [],
          },
          pii_available: false,
          consent_required: true,
          export_formats: ["json", "csv", "iso20022"],
          compliance_level: "aggregated_only",
        },
        200,
        corsHeaders,
      );
    }

    throw new HttpError(400, "Invalid action");
  } catch (error) {
    return errorResponse(error);
  }
});
