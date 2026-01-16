import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const OrderSummarySchema = z.object({
  business_id: z.string().min(1),
  date_range: z
    .object({
      start: z.string().min(1),
      end: z.string().min(1),
    })
    .optional(),
});

export type OrderSummaryInput = z.infer<typeof OrderSummarySchema>;
