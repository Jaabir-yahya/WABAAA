import { OrderSummarySchema } from "./schema.ts";
import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: { business_id: string; date_range?: { start: string; end: string } };

    if (req.method === "GET") {
      const url = new URL(req.url);
      const business_id = url.searchParams.get("business_id") ?? "";
      const start = url.searchParams.get("start") ?? undefined;
      const end = url.searchParams.get("end") ?? undefined;
      input = OrderSummarySchema.parse({
        business_id,
        date_range: start && end ? { start, end } : undefined,
      });
    } else if (req.method === "POST") {
      const body = await parseJson<Record<string, unknown>>(req);
      input = OrderSummarySchema.parse(body);
    } else {
      throw new HttpError(405, "Method not allowed");
    }

    await ensureBusinessActive(input.business_id);

    const supabase = getSupabaseClient();
    let query = supabase
      .from("orders")
      .select("id,total_amount,outstanding_amount,status,created_at")
      .eq("business_id", input.business_id);

    if (input.date_range?.start) {
      query = query.gte("created_at", input.date_range.start);
    }
    if (input.date_range?.end) {
      query = query.lte("created_at", input.date_range.end);
    }

    const { data: orders, error } = await query;
    if (error) {
      throw new HttpError(500, "Failed to fetch orders", {
        message: error.message,
      });
    }

    const totals = {
      total_orders: 0,
      total_amount: 0,
      total_paid: 0,
      total_outstanding: 0,
      orders_by_status: {
        pending: 0,
        partial: 0,
        paid: 0,
        fulfilled: 0,
      },
      daily_breakdown: [] as Array<{
        date: string;
        orders: number;
        revenue: number;
      }>,
    };

    const dailyMap = new Map<string, { orders: number; revenue: number }>();

    for (const order of orders ?? []) {
      const totalAmount = toNumber(order.total_amount);
      const outstanding = toNumber(order.outstanding_amount);
      const paid = Math.max(totalAmount - outstanding, 0);

      totals.total_orders += 1;
      totals.total_amount += totalAmount;
      totals.total_paid += paid;
      totals.total_outstanding += outstanding;

      if (order.status && order.status in totals.orders_by_status) {
        totals.orders_by_status[order.status as keyof typeof totals.orders_by_status] += 1;
      }

      const dateKey = new Date(order.created_at).toISOString().slice(0, 10);
      const entry = dailyMap.get(dateKey) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += paid;
      dailyMap.set(dateKey, entry);
    }

    totals.daily_breakdown = Array.from(dailyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ date, ...value }));

    return jsonResponse(totals, 200, corsHeaders);
  } catch (error) {
    return errorResponse(error);
  }
});
