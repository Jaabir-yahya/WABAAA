import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const RecordPaymentSchema = z.object({
  business_id: z.string().min(1),
  order_id: z.string().uuid(),
  customer_phone: z.string().min(6),
  amount: z.number().positive(),
  method: z.enum(["mpesa", "cash", "bank"]),
  mpesa_receipt: z.string().optional(),
  mpesa_transaction_id: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
