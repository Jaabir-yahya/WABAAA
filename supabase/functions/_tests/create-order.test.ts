import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CreateOrderSchema } from "../create-order/schema.ts";

Deno.test("create-order schema accepts valid input", () => {
  const parsed = CreateOrderSchema.parse({
    business_id: "elixosense",
    customer_phone: "+254712345678",
    items: [{ product: "sukari", quantity: 2, unit: "kg", price: 120 }],
    total_amount: 240,
    is_credit: false,
  });

  assertEquals(parsed.business_id, "elixosense");
});

Deno.test("create-order schema rejects invalid input", () => {
  assertThrows(() => {
    CreateOrderSchema.parse({
      business_id: "",
      customer_phone: "+254712345678",
      items: [],
      total_amount: 0,
    });
  });
});
