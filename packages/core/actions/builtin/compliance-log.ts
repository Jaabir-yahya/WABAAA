/**
 * compliance.log Action
 *
 * Log compliance-related events (health products, audits, verification).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

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

export const complianceLogAction = defineAction({
  id: 'compliance.log',
  category: 'data',
  description: 'Log compliance events to the commerce event store',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      eventType: stringProp('Compliance event type (e.g., product.verified)'),
      sourceChannel: stringProp('Source channel (whatsapp, web, api)'),
      customerPhone: stringProp('Customer phone number (optional)'),
      payload: {
        type: 'object',
        description: 'Compliance event payload',
        properties: {},
      },
    },
    ['eventType'],
    'Input for compliance.log action'
  ),

  outputSchema: objectSchema({
    eventId: { type: 'string', description: 'Logged event ID' },
    status: { type: 'string', description: 'Insert status' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const eventType = input.eventType as string;
      const sourceChannel = (input.sourceChannel as string) || context.sourceChannel || 'whatsapp';
      const customerPhone = input.customerPhone as string | undefined;
      const payload = (input.payload as Record<string, unknown>) || {};

      const { data, error } = await supabase
        .from('commerce_events')
        .insert({
          business_id: businessId,
          event_type: eventType,
          source_channel: sourceChannel,
          customer_phone: customerPhone ?? null,
          payload,
          idempotency_key: context.idempotencyKey,
          processing_status: 'completed',
        })
        .select('id')
        .single();

      if (error) {
        return failure(`Failed to log compliance event: ${error.message}`, {
          errorCode: 'COMPLIANCE_LOG_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        eventId: data.id,
        status: 'logged',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'COMPLIANCE_LOG_ERROR', shouldRetry: true }
      );
    }
  },
});
