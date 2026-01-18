/**
 * payment.record Action
 *
 * Record a payment and apply it to an order.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  defineAction,
  success,
  failure,
  objectSchema,
  stringProp,
  numberProp,
} from '../helpers';

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

export const paymentRecordAction = defineAction({
  id: 'payment.record',
  category: 'payment',
  description: 'Record a payment against an order',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      orderId: stringProp('Order ID to apply payment to'),
      amount: numberProp('Payment amount', { minimum: 1 }),
      method: stringProp('Payment method', { enum: ['mpesa', 'cash', 'bank', 'cheque'] }),
      reference: stringProp('Payment reference/transaction ID (optional)'),
      notes: stringProp('Optional notes'),
    },
    ['orderId', 'amount', 'method'],
    'Input for payment.record action'
  ),

  outputSchema: objectSchema({
    paymentId: { type: 'string', description: 'Payment ID' },
    remainingBalance: { type: 'number', description: 'Outstanding amount after payment' },
    orderStatus: { type: 'string', description: 'Updated order status' },
    appliedAmount: { type: 'number', description: 'Amount applied to order' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_phone, outstanding_amount, status')
        .eq('id', input.orderId)
        .eq('business_id', businessId)
        .single();

      if (orderError || !order) {
        return failure('Order not found', {
          errorCode: 'ORDER_NOT_FOUND',
          shouldRetry: false,
        });
      }

      const outstanding = Number(order.outstanding_amount || 0);
      const appliedAmount = Math.min(Number(input.amount), outstanding);

      const { error: eventError } = await supabase.from('commerce_events').insert({
        business_id: businessId,
        event_type: 'manual_correction',
        source_channel: 'api',
        event_data: {
          action: 'payment_recorded',
          order_id: input.orderId,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
        },
      });

      if (eventError) {
        return failure(`Failed to log payment event: ${eventError.message}`, {
          errorCode: 'PAYMENT_EVENT_FAILED',
          shouldRetry: true,
        });
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          business_id: businessId,
          order_id: input.orderId,
          customer_phone: order.customer_phone,
          amount: input.amount,
          applied_amount: appliedAmount,
          method: input.method,
          mpesa_receipt: input.method === 'mpesa' ? input.reference ?? null : null,
          mpesa_transaction_id: input.method === 'mpesa' ? input.reference ?? null : null,
          status: 'confirmed',
        })
        .select('*')
        .single();

      if (paymentError) {
        return failure(`Failed to record payment: ${paymentError.message}`, {
          errorCode: 'PAYMENT_RECORD_FAILED',
          shouldRetry: true,
        });
      }

      const { data: applied, error: applyError } = await supabase
        .rpc('apply_payment_to_order', {
          p_order_id: input.orderId,
          p_payment_amount: input.amount,
        })
        .select()
        .single();

      if (applyError || !applied?.success) {
        return failure(`Failed to apply payment: ${applyError?.message ?? applied?.message}`, {
          errorCode: 'PAYMENT_APPLY_FAILED',
          shouldRetry: true,
        });
      }

      const { data: updatedOrder, error: updatedError } = await supabase
        .from('orders')
        .select('outstanding_amount, status')
        .eq('id', input.orderId)
        .eq('business_id', businessId)
        .single();

      if (updatedError || !updatedOrder) {
        return failure(`Failed to load updated order: ${updatedError?.message}`, {
          errorCode: 'ORDER_FETCH_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        paymentId: payment.id,
        remainingBalance: updatedOrder.outstanding_amount,
        orderStatus: updatedOrder.status,
        appliedAmount,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'PAYMENT_ERROR', shouldRetry: true }
      );
    }
  },
});
