import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CreateOrderSchema } from "../create-order/schema.ts";
import { RecordPaymentSchema } from "../record-payment/schema.ts";
import { CorrectOrderSchema } from "../correct-order/schema.ts";
import { OrderSummarySchema } from "../get-order-summary/schema.ts";

Deno.test("end-to-end schema flow validates", () => {
  const order = CreateOrderSchema.parse({
    business_id: "elixosense",
    customer_phone: "+254712345678",
    items: [{ product: "sukari", quantity: 1, unit: "kg", price: 120 }],
    total_amount: 120,
  });

  const payment = RecordPaymentSchema.parse({
    business_id: order.business_id,
    order_id: "79c4f727-c843-4470-b0a5-862b96d62c1b",
    customer_phone: order.customer_phone,
    amount: 120,
    method: "cash",
  });

  const correction = CorrectOrderSchema.parse({
    business_id: order.business_id,
    order_id: payment.order_id,
    correction_type: "payment_terms",
    new_value: "COD",
    reason: "Customer requested cash on delivery",
  });

  const summary = OrderSummarySchema.parse({
    business_id: order.business_id,
  });

  assertEquals(summary.business_id, order.business_id);
  assertEquals(correction.correction_type, "payment_terms");
});
