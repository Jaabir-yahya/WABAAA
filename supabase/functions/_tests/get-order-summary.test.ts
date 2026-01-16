import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { OrderSummarySchema } from "../get-order-summary/schema.ts";

Deno.test("get-order-summary schema accepts date range", () => {
  const parsed = OrderSummarySchema.parse({
    business_id: "elixosense",
    date_range: {
      start: "2026-01-01",
      end: "2026-01-31",
    },
  });

  assertEquals(parsed.business_id, "elixosense");
});

Deno.test("get-order-summary schema rejects missing business_id", () => {
  assertThrows(() => {
    OrderSummarySchema.parse({});
  });
});
