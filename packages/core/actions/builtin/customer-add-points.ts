/**
 * customer.add_points Action
 *
 * Log loyalty points added for a customer.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp, numberProp } from '../helpers';

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

export const customerAddPointsAction = defineAction({
  id: 'customer.add_points',
  category: 'identity',
  description: 'Record loyalty points for a customer',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      customerPhone: stringProp('Customer phone number'),
      points: numberProp('Points to add', { minimum: 1 }),
      reason: stringProp('Reason for points (optional)'),
      orderId: stringProp('Related order ID (optional)'),
    },
    ['customerPhone', 'points'],
    'Input for customer.add_points action'
  ),

  outputSchema: objectSchema({
    eventId: { type: 'string', description: 'Points event ID' },
    status: { type: 'string', description: 'Points status' },
    pointsAdded: { type: 'number', description: 'Points added' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const customerPhone = input.customerPhone as string;
      const points = Number(input.points ?? 0);
      const reason = input.reason as string | undefined;
      const orderId = input.orderId as string | undefined;

      const { data, error } = await supabase
        .from('commerce_events')
        .insert({
          business_id: businessId,
          event_type: 'customer.points.added',
          source_channel: context.sourceChannel || 'system',
          source_id: orderId ?? null,
          customer_phone: customerPhone,
          payload: {
            points,
            reason,
            orderId,
          },
          idempotency_key: context.idempotencyKey,
          processing_status: 'completed',
        })
        .select('id')
        .single();

      if (error) {
        return failure(`Failed to add points: ${error.message}`, {
          errorCode: 'POINTS_ADD_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        eventId: data.id,
        status: 'recorded',
        pointsAdded: points,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'POINTS_ADD_ERROR', shouldRetry: true }
      );
    }
  },
});
