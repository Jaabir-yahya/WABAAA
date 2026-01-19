import { getSupabaseClient } from "../_shared/db.ts";
import { jsonResponse } from "../_shared/errors.ts";
import { logQRConversion } from "../_shared/qr-analytics.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

// NOTE: Deploy this function with verify_jwt=false because Daraja callbacks
// are unsigned webhooks and cannot include Supabase JWTs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MPESA_IP_ALLOWLIST = new Set([
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.128",
  "196.201.212.129",
]);

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

type CallbackMetadataItem = { Name: string; Value?: string | number };

interface MpesaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: CallbackMetadataItem[];
      };
    };
  };
}

const RESULT_CODE_MAP: Record<
  string,
  { status: string; merchantAction: string; shouldRetry: boolean }
> = {
  "0": { status: "SUCCESS", merchantAction: "CONFIRM_ORDER", shouldRetry: false },
  "1": {
    status: "FAILED",
    merchantAction: "NOTIFY_CUSTOMER_INSUFFICIENT_BALANCE",
    shouldRetry: true,
  },
  "2": { status: "FAILED", merchantAction: "FIX_AMOUNT_MINIMUM", shouldRetry: false },
  "3": { status: "FAILED", merchantAction: "FIX_AMOUNT_MAXIMUM", shouldRetry: false },
  "4": {
    status: "FAILED",
    merchantAction: "NOTIFY_CUSTOMER_DAILY_LIMIT",
    shouldRetry: true,
  },
  "8": {
    status: "FAILED",
    merchantAction: "NOTIFY_CUSTOMER_WITHDRAW_FUNDS",
    shouldRetry: true,
  },
  "17": { status: "FAILED", merchantAction: "WAIT_AND_RETRY", shouldRetry: true },
  "1019": {
    status: "FAILED",
    merchantAction: "NOTIFY_CUSTOMER_RETRY",
    shouldRetry: true,
  },
  "1025": { status: "FAILED", merchantAction: "SHORTEN_DESCRIPTION", shouldRetry: false },
  "1032": {
    status: "CANCELLED",
    merchantAction: "NOTIFY_CUSTOMER_RETRY_AVAILABLE",
    shouldRetry: true,
  },
  "1037": {
    status: "TIMEOUT",
    merchantAction: "NOTIFY_CUSTOMER_RETRY",
    shouldRetry: true,
  },
  "2001": {
    status: "FAILED",
    merchantAction: "NOTIFY_CUSTOMER_WRONG_PIN",
    shouldRetry: true,
  },
  "2028": { status: "FAILED", merchantAction: "CONTACT_SUPPORT", shouldRetry: false },
  "8006": { status: "FAILED", merchantAction: "NOTIFY_CUSTOMER_CALL_100", shouldRetry: false },
  "SFC_IC0003": {
    status: "FAILED",
    merchantAction: "CONTACT_SUPPORT",
    shouldRetry: false,
  },
};

function getResultInfo(resultCode: string) {
  return RESULT_CODE_MAP[resultCode] ?? {
    status: "UNKNOWN",
    merchantAction: "CONTACT_SUPPORT",
    shouldRetry: false,
  };
}

function getMetadataValue(items: CallbackMetadataItem[], name: string) {
  return items.find((item) => item.Name === name)?.Value;
}

type QRMetadata = {
  b: string;
  t?: string;
  p?: string;
  q?: number;
  u?: string;
  a?: number;
  o?: string;
  ts?: number;
};

function decodeQRMetadata(reference?: string | number | null): QRMetadata | null {
  if (!reference || typeof reference !== "string") return null;
  if (!reference.startsWith("KCOS:")) return null;
  try {
    const encoded = reference.replace("KCOS:", "");
    const json = atob(encoded);
    return JSON.parse(json) as QRMetadata;
  } catch {
    return null;
  }
}

function getReferenceValue(items: CallbackMetadataItem[]) {
  return (
    getMetadataValue(items, "AccountReference") ??
    getMetadataValue(items, "Reference") ??
    getMetadataValue(items, "TransactionReference")
  );
}

async function createQROrder(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  businessId: string;
  productId?: string;
  quantity?: number;
  unit?: string;
  amount: number;
  customerPhone?: string | null;
  mpesaReceipt: string;
  qrReference: string;
}) {
  const items = params.productId
    ? [{
      product: params.productId,
      quantity: params.quantity ?? 1,
      unit: params.unit ?? "pcs",
    }]
    : [];

  const { data: order, error } = await params.supabase
    .from("orders")
    .insert({
      business_id: params.businessId,
      customer_phone: params.customerPhone ?? "unknown",
      total_amount: params.amount,
      outstanding_amount: 0,
      items,
      status: "paid",
      source: "qr_code",
      qr_metadata: {
        product_id: params.productId ?? null,
        quantity: params.quantity ?? null,
        unit: params.unit ?? null,
        amount: params.amount,
        mpesa_receipt: params.mpesaReceipt,
      },
      qr_reference: params.qrReference,
    })
    .select("id")
    .single();

  if (error || !order) {
    return null;
  }

  return order.id as string;
}

export function createMpesaCallbackHandler(
  supabaseFactory: () => ReturnType<typeof getSupabaseClient> = getSupabaseClient,
) {
  return async function handleCallback(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    try {
      const ipAddress = getClientIp(req);
      const allowlistDisabled =
        Deno.env.get("MPESA_IP_ALLOWLIST_DISABLED") === "true";

      if (!allowlistDisabled && !MPESA_IP_ALLOWLIST.has(ipAddress)) {
        return jsonResponse(
          { error: "Unauthorized IP" },
          403,
          corsHeaders,
        );
      }

      const userAgent = req.headers.get("user-agent") ?? "unknown";
      await enforceRateLimit({
        key: `mpesa-callback:${ipAddress}`,
        max: 120,
        windowMs: 60_000,
        businessId: "system",
        action: "mpesa-callback",
        ipAddress,
        userAgent,
      });

      const payload = (await req.json()) as MpesaCallbackPayload;
      const stkCallback = payload.Body?.stkCallback;

    if (!stkCallback?.CheckoutRequestID) {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID ?? null;
    const resultCode = String(stkCallback.ResultCode ?? "");
    const resultDesc = stkCallback.ResultDesc ?? "";
    const metaItems = stkCallback.CallbackMetadata?.Item ?? [];
    const referenceValue = getReferenceValue(metaItems);

    const amountValue = getMetadataValue(metaItems, "Amount");
    const receiptValue = getMetadataValue(metaItems, "MpesaReceiptNumber");
    const phoneValue = getMetadataValue(metaItems, "PhoneNumber");
    const transactionDate = getMetadataValue(metaItems, "TransactionDate");

    const supabase = supabaseFactory();

    const { data: existingEvent } = await supabase
      .from("commerce_events")
      .select("id")
      .eq("idempotency_key", `mpesa:callback:${checkoutRequestId}`)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    const { data: stkEvent, error: stkEventError } = await supabase
      .from("commerce_events")
      .select("business_id,payload")
      .eq("payload->>checkout_request_id", checkoutRequestId)
      .eq("payload->>note_type", "mpesa_stk_initiated")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const qrMetadata = decodeQRMetadata(referenceValue);

    if ((stkEventError || !stkEvent) && qrMetadata && resultCode === "0") {
      const businessId = qrMetadata.b;
      const amount = typeof amountValue === "number"
        ? amountValue
        : Number(amountValue ?? qrMetadata.a ?? 0);
      const mpesaReceipt = receiptValue ? String(receiptValue) : "";
      const customerPhone = phoneValue ? String(phoneValue) : null;

      if (businessId && amount > 0 && mpesaReceipt) {
        const orderId = await createQROrder({
          supabase,
          businessId,
          productId: qrMetadata.p,
          quantity: qrMetadata.q,
          unit: qrMetadata.u,
          amount,
          customerPhone,
          mpesaReceipt,
          qrReference: String(referenceValue),
        });

        if (orderId) {
          await supabase.from("payments").insert({
            business_id: businessId,
            order_id: orderId,
            customer_phone: customerPhone,
            amount,
            applied_amount: amount,
            method: "mpesa",
            mpesa_receipt: mpesaReceipt,
            mpesa_transaction_id: checkoutRequestId,
            status: "confirmed",
          });

          await logQRConversion({
            businessId,
            orderId,
            amount,
            productId: qrMetadata.p,
            quantity: qrMetadata.q,
            metadata: {
              mpesa_receipt: mpesaReceipt,
              reference: referenceValue,
            },
          });
        }
      }

      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    if (stkEventError || !stkEvent) {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    const businessId = stkEvent.business_id as string;
    const orderId = (stkEvent.payload as Record<string, unknown>)?.order_id as
      | string
      | undefined;

    if (!businessId || !orderId) {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    const amount = typeof amountValue === "number"
      ? amountValue
      : Number(amountValue ?? 0);
    const mpesaReceipt = receiptValue ? String(receiptValue) : null;
    const customerPhone = phoneValue ? String(phoneValue) : null;

    let appliedAmount = 0;
    let outstandingAmount: number | null = null;

    if (resultCode === "0" && mpesaReceipt) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id,customer_phone,outstanding_amount")
        .eq("id", orderId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!orderError && order) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            business_id: businessId,
            order_id: orderId,
            customer_phone: customerPhone ?? order.customer_phone,
            amount,
            applied_amount: amount,
            method: "mpesa",
            mpesa_receipt: mpesaReceipt,
            mpesa_transaction_id: checkoutRequestId,
            status: "confirmed",
          });

        if (!paymentError) {
          appliedAmount = amount;
          const { data: applyResult, error: applyError } = await supabase
            .schema("public")
            .rpc(
              "apply_payment_to_order",
              {
                p_order_id: orderId,
                p_payment_amount: amount,
              },
            );

          if (!applyError) {
            outstandingAmount = applyResult?.[0]?.new_outstanding_amount ?? null;
          } else {
            const currentOutstanding = Number(order.outstanding_amount ?? 0);
            const newOutstanding = Math.max(0, currentOutstanding - amount);
            const newStatus = newOutstanding === 0 ? "paid" : "partial";

            await supabase
              .from("orders")
              .update({
                outstanding_amount: newOutstanding,
                status: newStatus,
              })
              .eq("id", orderId)
              .eq("business_id", businessId);

            outstandingAmount = newOutstanding;
          }
        } else if (paymentError.code !== "23505") {
          return jsonResponse({ status: "ok" }, 200, corsHeaders);
        }
      }
    }

    const resultInfo = getResultInfo(resultCode);

    await supabase.from("commerce_events").insert({
      business_id: businessId,
      event_type: "mpesa_payment_callback",
      source_channel: "mpesa",
      source_id: mpesaReceipt ?? checkoutRequestId,
      customer_phone: customerPhone,
      payload: {
        checkout_request_id: checkoutRequestId,
        merchant_request_id: merchantRequestId,
        result_code: resultCode,
        result_desc: resultDesc,
        result_status: resultInfo.status,
        merchant_action: resultInfo.merchantAction,
        should_retry: resultInfo.shouldRetry,
        mpesa_receipt: mpesaReceipt,
        amount,
        applied_amount: appliedAmount,
        phone: customerPhone,
        transaction_date: transactionDate,
        order_id: orderId,
        outstanding_after: outstandingAmount,
      },
      idempotency_key: `mpesa:callback:${checkoutRequestId}`,
      processing_status: resultCode === "0" ? "completed" : "failed",
    });

      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    } catch (error) {
      console.error("mpesa-callback error", error);
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }
  };
}

const handleCallback = createMpesaCallbackHandler();

if (import.meta.main) {
  Deno.serve((req) => handleCallback(req));
}

export default handleCallback;
