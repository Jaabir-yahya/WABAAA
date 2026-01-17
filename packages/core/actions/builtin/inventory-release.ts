/**
 * inventory.release Action
 *
 * Release reserved inventory items by logging an inventory event.
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

export const inventoryReleaseAction = defineAction({
  id: 'inventory.release',
  category: 'inventory',
  description: 'Release reserved inventory items',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      orderId: stringProp('Order ID'),
      locationId: stringProp('Location/warehouse ID (optional)'),
      items: {
        type: 'array',
        description: 'Items to release',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            sku: { type: 'string' },
          },
        },
      },
      reason: stringProp('Release reason (optional)'),
    },
    ['orderId', 'items'],
    'Input for inventory.release action'
  ),

  outputSchema: objectSchema({
    eventId: { type: 'string', description: 'Inventory release event ID' },
    status: { type: 'string', description: 'Release status' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const orderId = input.orderId as string;
      const locationId = input.locationId as string | undefined;
      const items = (input.items as Array<Record<string, unknown>>) || [];
      const reason = input.reason as string | undefined;

      const { data, error } = await supabase
        .from('commerce_events')
        .insert({
          business_id: businessId,
          event_type: 'inventory.released',
          source_channel: context.sourceChannel || 'system',
          source_id: orderId,
          payload: {
            orderId,
            locationId,
            items,
            reason,
          },
          idempotency_key: context.idempotencyKey,
          processing_status: 'completed',
        })
        .select('id')
        .single();

      if (error) {
        return failure(`Failed to release inventory: ${error.message}`, {
          errorCode: 'INVENTORY_RELEASE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        eventId: data.id,
        status: 'released',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'INVENTORY_RELEASE_ERROR', shouldRetry: true }
      );
    }
  },
});
