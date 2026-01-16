import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const GeneratePaymentLinkSchema = z.object({
  business_id: z.string().min(1),
  order_id: z.string().uuid(),
});

export type GeneratePaymentLinkInput = z.infer<typeof GeneratePaymentLinkSchema>;
