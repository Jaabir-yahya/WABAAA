import { CreateOrderSchema } from "./schema.ts";
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
    const input = CreateOrderSchema.parse(body);

    await ensureBusinessActive(input.business_id);

    const supabase = getSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: input.business_id,
        customer_phone: input.customer_phone,
        customer_name: input.customer_name ?? null,
        total_amount: input.total_amount,
        outstanding_amount: input.total_amount,
        is_credit: input.is_credit ?? false,
        payment_terms: input.payment_terms ?? null,
        items: input.items,
        delivery_address: input.delivery_address ?? null,
        status: "pending",
      })
      .select("*")
      .single();

    if (orderError) {
      throw new HttpError(500, "Failed to create order", {
        message: orderError.message,
      });
    }

    const idempotencyKey = req.headers.get("x-idempotency-key");

    const { error: eventError } = await supabase
      .from("commerce_events")
      .insert({
        business_id: input.business_id,
        event_type: "whatsapp_message_in",
        source_channel: "web",
        source_id: order.id,
        customer_phone: input.customer_phone,
        customer_name: input.customer_name ?? null,
        payload: {
          order_id: order.id,
          items: input.items,
          total_amount: input.total_amount,
          is_credit: input.is_credit ?? false,
        },
        idempotency_key: idempotencyKey ?? null,
        processing_status: "completed",
      });

    if (eventError) {
      throw new HttpError(500, "Failed to log order event", {
        message: eventError.message,
      });
    }

    return jsonResponse(
      {
        order_id: order.id,
        outstanding_amount: order.outstanding_amount,
        status: order.status,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
