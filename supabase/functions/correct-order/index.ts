import { CorrectOrderSchema } from "./schema.ts";
import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderUpdate = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<Record<string, unknown>>(req);
    const input = CorrectOrderSchema.parse(body);

    await ensureBusinessActive(input.business_id);

    const supabase = getSupabaseClient();
    const { data: existingOrder, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", input.order_id)
      .eq("business_id", input.business_id)
      .maybeSingle();

    if (orderError) {
      throw new HttpError(500, "Failed to fetch order", {
        message: orderError.message,
      });
    }

    if (!existingOrder) {
      throw new HttpError(404, "Order not found");
    }

    const updates: OrderUpdate = {};
    let applied = true;

    switch (input.correction_type) {
      case "amount": {
        if (typeof input.new_value === "number") {
          updates.total_amount = input.new_value;
          updates.outstanding_amount = input.new_value;
        } else {
          applied = false;
        }
        break;
      }
      case "items": {
        if (Array.isArray(input.new_value)) {
          updates.items = input.new_value;
        } else {
          applied = false;
        }
        break;
      }
      case "customer": {
        if (
          typeof input.new_value === "object" && input.new_value !== null
        ) {
          const value = input.new_value as Record<string, unknown>;
          if (typeof value.customer_phone === "string") {
            updates.customer_phone = value.customer_phone;
          }
          if (typeof value.customer_name === "string") {
            updates.customer_name = value.customer_name;
          }
          if (Object.keys(updates).length === 0) {
            applied = false;
          }
        } else {
          applied = false;
        }
        break;
      }
      case "payment_terms": {
        if (typeof input.new_value === "string") {
          updates.payment_terms = input.new_value;
        } else {
          applied = false;
        }
        break;
      }
      default:
        applied = false;
    }

    let updatedOrder = existingOrder;
    let updateErrorMessage: string | null = null;

    if (applied && Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", input.order_id)
        .eq("business_id", input.business_id)
        .select("*")
        .single();

      if (error) {
        applied = false;
        updateErrorMessage = error.message;
      } else if (data) {
        updatedOrder = data;
      }
    }

    const idempotencyKey = req.headers.get("x-idempotency-key");
    const { error: eventError } = await supabase
      .from("commerce_events")
      .insert({
        business_id: input.business_id,
        event_type: "manual_correction",
        source_channel: "web",
        source_id: input.order_id,
        customer_phone: existingOrder.customer_phone,
        customer_name: existingOrder.customer_name,
        payload: {
          order_id: input.order_id,
          correction_type: input.correction_type,
          new_value: input.new_value,
          reason: input.reason,
          applied,
          update_error: updateErrorMessage,
          before: {
            total_amount: existingOrder.total_amount,
            outstanding_amount: existingOrder.outstanding_amount,
            items: existingOrder.items,
            customer_phone: existingOrder.customer_phone,
            customer_name: existingOrder.customer_name,
            payment_terms: existingOrder.payment_terms,
          },
          after: applied ? updates : null,
        },
        idempotency_key: idempotencyKey ?? null,
        processing_status: "completed",
      });

    if (eventError) {
      throw new HttpError(500, "Failed to log correction event", {
        message: eventError.message,
      });
    }

    return jsonResponse(
      {
        order: updatedOrder,
        correction_applied: applied,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
