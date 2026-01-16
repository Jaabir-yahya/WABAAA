import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const CreateOrderSchema = z.object({
  business_id: z.string().min(1),
  customer_phone: z.string().min(6),
  customer_name: z.string().optional(),
  items: z.array(
    z.object({
      product: z.string().min(1),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      price: z.number().positive(),
    }),
  ),
  total_amount: z.number().positive(),
  is_credit: z.boolean().optional(),
  payment_terms: z.string().optional(),
  delivery_address: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
