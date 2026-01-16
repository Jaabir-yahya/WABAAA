import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const CorrectOrderSchema = z.object({
  business_id: z.string().min(1),
  order_id: z.string().uuid(),
  correction_type: z.enum(["amount", "items", "customer", "payment_terms"]),
  new_value: z.unknown(),
  reason: z.string().min(1),
});

export type CorrectOrderInput = z.infer<typeof CorrectOrderSchema>;
