/**
 * order.create Action
 *
 * Create an order record in the database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp, numberProp, booleanProp } from '../helpers';

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedSupabase = createClient(url, serviceKey);
  return cachedSupabase;
}

export const orderCreateAction = defineAction({
  id: 'order.create',
  category: 'data',
  description: 'Create a new order record',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      customerPhone: stringProp('Customer phone number'),
      customerName: stringProp('Customer name (optional)'),
      totalAmount: numberProp('Total order amount', { minimum: 1 }),
      isCredit: booleanProp('Is this a credit order?', false),
      paymentTerms: stringProp('Payment terms (optional)'),
      deliveryAddress: stringProp('Delivery address (optional)'),
      items: {
        type: 'array',
        description: 'Order items',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
          },
        },
      },
    },
    ['customerPhone', 'totalAmount', 'items'],
    'Input for order.create action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Order ID' },
    status: { type: 'string', description: 'Order status' },
    totalAmount: { type: 'number', description: 'Total amount' },
    outstandingAmount: { type: 'number', description: 'Outstanding amount' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();

      const businessId = (input.businessId as string) || context.tenantId;

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_phone: input.customerPhone,
          customer_name: input.customerName ?? null,
          total_amount: input.totalAmount,
          outstanding_amount: input.totalAmount,
          is_credit: input.isCredit ?? false,
          payment_terms: input.paymentTerms ?? null,
          items: input.items,
          delivery_address: input.deliveryAddress ?? null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to create order: ${error.message}`, {
          errorCode: 'ORDER_CREATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: order.id,
        status: order.status,
        totalAmount: order.total_amount,
        outstandingAmount: order.outstanding_amount,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'ORDER_ERROR', shouldRetry: true }
      );
    }
  },
});
