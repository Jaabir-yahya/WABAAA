import { RecordPaymentSchema } from "./schema.ts";
import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<Record<string, unknown>>(req);
    const input = RecordPaymentSchema.parse(body);

    await ensureBusinessActive(input.business_id);

    const supabase = getSupabaseClient();

    if (input.mpesa_receipt) {
      const { data: existingPayment, error: existingError } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", input.business_id)
        .eq("mpesa_receipt", input.mpesa_receipt)
        .maybeSingle();

      if (existingError) {
        throw new HttpError(500, "Failed to check idempotency", {
          message: existingError.message,
        });
      }

      if (existingPayment) {
        const { data: existingOrder, error: orderError } = await supabase
          .from("orders")
          .select("outstanding_amount,status")
          .eq("id", existingPayment.order_id)
          .eq("business_id", input.business_id)
          .maybeSingle();

        if (orderError) {
          throw new HttpError(500, "Failed to fetch order", {
            message: orderError.message,
          });
        }

        return jsonResponse(
          {
            payment_id: existingPayment.id,
            outstanding_amount: existingOrder?.outstanding_amount ?? null,
            status: existingOrder?.status ?? null,
            idempotent: true,
          },
          200,
          corsHeaders,
        );
      }
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,business_id,outstanding_amount,status")
      .eq("id", input.order_id)
      .eq("business_id", input.business_id)
      .maybeSingle();

    if (orderError) {
      throw new HttpError(500, "Failed to fetch order", {
        message: orderError.message,
      });
    }

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        business_id: input.business_id,
        order_id: input.order_id,
        customer_phone: input.customer_phone,
        amount: input.amount,
        applied_amount: input.amount,
        method: input.method,
        mpesa_receipt: input.mpesa_receipt ?? null,
        mpesa_transaction_id: input.mpesa_transaction_id ?? null,
        status: "confirmed",
      })
      .select("*")
      .single();

    if (paymentError) {
      throw new HttpError(500, "Failed to record payment", {
        message: paymentError.message,
      });
    }

    const { data: applyResult, error: applyError } = await supabase
      .schema("public")
      .rpc(
        "apply_payment_to_order",
        {
          p_order_id: input.order_id,
          p_payment_amount: input.amount,
        },
      );

    let newOutstanding = applyResult?.[0]?.new_outstanding_amount ?? null;

    if (applyError) {
      const currentOutstanding = Number(order.outstanding_amount ?? 0);
      const calculatedOutstanding = Math.max(
        0,
        currentOutstanding - input.amount,
      );
      const newStatus = calculatedOutstanding === 0 ? "paid" : "partial";

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          outstanding_amount: calculatedOutstanding,
          status: newStatus,
        })
        .eq("id", input.order_id)
        .eq("business_id", input.business_id);

      if (updateError) {
        throw new HttpError(500, "Failed to apply payment", {
          message: applyError.message,
        });
      }

      newOutstanding = calculatedOutstanding;
    }

    const idempotencyKey = req.headers.get("x-idempotency-key");

    const { error: eventError } = await supabase
      .from("commerce_events")
      .insert({
        business_id: input.business_id,
        event_type: "mpesa_payment_callback",
        source_channel: "mpesa",
        source_id: input.mpesa_transaction_id ?? payment.id,
        customer_phone: input.customer_phone,
        payload: {
          order_id: input.order_id,
          amount: input.amount,
          applied_amount: input.amount,
          method: input.method,
          mpesa_receipt: input.mpesa_receipt ?? null,
          mpesa_transaction_id: input.mpesa_transaction_id ?? null,
        },
        idempotency_key: idempotencyKey ?? null,
        processing_status: "completed",
      });

    if (eventError) {
      throw new HttpError(500, "Failed to log payment event", {
        message: eventError.message,
      });
    }

    return jsonResponse(
      {
        payment_id: payment.id,
        outstanding_amount: newOutstanding,
        status: payment.status,
        idempotent: false,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
