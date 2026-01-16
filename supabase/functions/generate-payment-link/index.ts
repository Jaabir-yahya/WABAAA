import { GeneratePaymentLinkSchema } from "./schema.ts";
import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { createMPesaClient } from "../_shared/mpesa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeKenyanPhone(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)]/g, "");

  if (clean.startsWith("+254")) {
    clean = clean.slice(1);
  } else if (clean.startsWith("0")) {
    clean = `254${clean.slice(1)}`;
  } else if (clean.startsWith("7") && clean.length === 9) {
    clean = `254${clean}`;
  }

  if (!/^254[17]\d{8}$/.test(clean)) {
    throw new HttpError(400, `Invalid Kenyan phone: ${phone}`);
  }

  return clean;
}

function validateAmount(amount: number) {
  if (amount < 1) {
    throw new HttpError(400, "Amount must be at least KSh 1");
  }
  if (amount > 250000) {
    throw new HttpError(
      400,
      "Amount exceeds M-Pesa limit (KSh 250,000). Split into multiple payments.",
    );
  }
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Missing ${name} environment variable`);
  }
  return value;
}

async function logStkEvent(
  supabase: any,
  {
    businessId,
    orderId,
    phone,
    amount,
    result,
  }: {
    businessId: string;
    orderId: string;
    phone: string;
    amount: number;
    result: {
      success: boolean;
      checkoutRequestId?: string;
      merchantRequestId?: string;
      error?: string;
    };
  },
) {
  const { error } = await supabase.from("commerce_events").insert({
    business_id: businessId,
    event_type: "merchant_note",
    source_channel: "mpesa",
    source_id: result.checkoutRequestId ?? orderId,
    customer_phone: phone,
    payload: {
      note_type: "mpesa_stk_initiated",
      order_id: orderId,
      amount,
      checkout_request_id: result.checkoutRequestId ?? null,
      merchant_request_id: result.merchantRequestId ?? null,
      success: result.success,
      error: result.error ?? null,
    },
    idempotency_key: `stk:${orderId}:${result.checkoutRequestId ?? crypto.randomUUID()}`,
    occurred_at: new Date().toISOString(),
    processing_status: result.success ? "completed" : "failed",
  });

  if (error) {
    throw new HttpError(500, "Failed to log STK event", {
      message: error.message,
    });
  }
}

export async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<Record<string, unknown>>(req);
    const input = GeneratePaymentLinkSchema.parse(body);

    await ensureBusinessActive(input.business_id);

    const supabase = getSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,business_id,customer_phone,outstanding_amount,status")
      .eq("id", input.order_id)
      .eq("business_id", input.business_id)
      .single();

    if (orderError || !order) {
      throw new HttpError(404, "Order not found");
    }

    const outstandingAmount = Number(order.outstanding_amount);
    if (!Number.isFinite(outstandingAmount)) {
      throw new HttpError(500, "Invalid order amount");
    }

    if (outstandingAmount <= 0) {
      throw new HttpError(400, "Order already fully paid");
    }

    const phone = normalizeKenyanPhone(order.customer_phone);
    validateAmount(outstandingAmount);

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("config,mpesa_shortcode")
      .eq("id", input.business_id)
      .single();

    if (businessError || !business) {
      throw new HttpError(500, "Failed to load business config");
    }

    const config = business.config ?? {};
    const mpesaConfig = config.mpesa ?? {};
    const shortcode = mpesaConfig.shortcode ?? business.mpesa_shortcode;

    if (!shortcode) {
      throw new HttpError(500, "M-Pesa shortcode not configured");
    }

    const client = createMPesaClient({
      consumerKey: getEnv("MPESA_CONSUMER_KEY"),
      consumerSecret: getEnv("MPESA_CONSUMER_SECRET"),
      shortcode,
      passkey: getEnv("MPESA_PASSKEY"),
      callbackUrl: getEnv("MPESA_CALLBACK_URL"),
      environment: (Deno.env.get("MPESA_ENVIRONMENT") ?? "sandbox") as
        | "sandbox"
        | "production",
    });

    const result = await client.stkPush({
      phone,
      amount: outstandingAmount,
      accountReference: order.id,
      transactionDesc: `Order${order.id.slice(0, 8)}`,
    });

    await logStkEvent(supabase, {
      businessId: input.business_id,
      orderId: order.id,
      phone,
      amount: outstandingAmount,
      result,
    });

    return jsonResponse(
      {
        success: result.success,
        message: result.success
          ? "Payment prompt sent to customer"
          : result.error ?? "STK Push failed",
        checkout_request_id: result.checkoutRequestId ?? null,
        merchant_request_id: result.merchantRequestId ?? null,
      },
      result.success ? 200 : 502,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleRequest(req));
}
