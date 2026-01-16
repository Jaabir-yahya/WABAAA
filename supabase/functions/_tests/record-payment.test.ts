import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RecordPaymentSchema } from "../record-payment/schema.ts";

Deno.test("record-payment schema accepts mpesa payment", () => {
  const parsed = RecordPaymentSchema.parse({
    business_id: "elixosense",
    order_id: "79c4f727-c843-4470-b0a5-862b96d62c1b",
    customer_phone: "+254712345678",
    amount: 500,
    method: "mpesa",
    mpesa_receipt: "RBK12345678",
  });

  assertEquals(parsed.method, "mpesa");
});

Deno.test("record-payment schema rejects missing amount", () => {
  assertThrows(() => {
    RecordPaymentSchema.parse({
      business_id: "elixosense",
      order_id: "79c4f727-c843-4470-b0a5-862b96d62c1b",
      customer_phone: "+254712345678",
      method: "cash",
    });
  });
});
