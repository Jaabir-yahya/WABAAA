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
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
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
    if (!body.business_id) {
      throw new HttpError(400, "Missing business_id");
    }

    await ensureBusinessActive(body.business_id);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `business-metrics:${body.business_id}:${ipAddress}`,
      max: 5,
      windowMs: 60_000,
      businessId: body.business_id,
      action: "update-business-metrics",
      ipAddress,
      userAgent,
    });

    const supabase = getSupabaseClient();
    const start30 = daysAgo(30).toISOString();
    const start90 = daysAgo(90).toISOString();

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("applied_amount,created_at")
      .eq("business_id", body.business_id)
      .eq("status", "confirmed")
      .gte("created_at", start90);

    if (paymentsError) {
      throw new HttpError(500, "Failed to load payments", {
        message: paymentsError.message,
      });
    }

    let revenue90 = 0;
    let revenue30 = 0;
    for (const payment of payments ?? []) {
      const amount = Number(payment.applied_amount ?? 0);
      revenue90 += amount;
      if (payment.created_at >= start30) {
        revenue30 += amount;
      }
    }

    const avgDaily = revenue30 / 30;

    const { error: upsertError } = await supabase
      .from("business_financial_metrics")
      .upsert({
        business_id: body.business_id,
        revenue_last_30_days: revenue30,
        revenue_last_90_days: revenue90,
        avg_daily_revenue: avgDaily,
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id" });

    if (upsertError) {
      throw new HttpError(500, "Failed to update business metrics", {
        message: upsertError.message,
      });
    }

    return jsonResponse(
      {
        success: true,
        revenue_last_30_days: revenue30,
        revenue_last_90_days: revenue90,
        avg_daily_revenue: avgDaily,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
