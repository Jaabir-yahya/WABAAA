import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CorrectOrderSchema } from "../correct-order/schema.ts";

Deno.test("correct-order schema accepts amount correction", () => {
  const parsed = CorrectOrderSchema.parse({
    business_id: "elixosense",
    order_id: "79c4f727-c843-4470-b0a5-862b96d62c1b",
    correction_type: "amount",
    new_value: 2000,
    reason: "Updated order total",
  });

  assertEquals(parsed.correction_type, "amount");
});

Deno.test("correct-order schema rejects missing reason", () => {
  assertThrows(() => {
    CorrectOrderSchema.parse({
      business_id: "elixosense",
      order_id: "79c4f727-c843-4470-b0a5-862b96d62c1b",
      correction_type: "items",
      new_value: [],
    });
  });
});
