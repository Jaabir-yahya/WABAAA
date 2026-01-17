/**
 * inventory.reserve Action
 *
 * Reserve inventory items for an order by logging an inventory event.
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

export const inventoryReserveAction = defineAction({
  id: 'inventory.reserve',
  category: 'inventory',
  description: 'Reserve inventory items for an order',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      orderId: stringProp('Order ID'),
      locationId: stringProp('Location/warehouse ID (optional)'),
      items: {
        type: 'array',
        description: 'Items to reserve',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            sku: { type: 'string' },
          },
        },
      },
    },
    ['orderId', 'items'],
    'Input for inventory.reserve action'
  ),

  outputSchema: objectSchema({
    eventId: { type: 'string', description: 'Inventory reservation event ID' },
    status: { type: 'string', description: 'Reservation status' },
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

      const { data, error } = await supabase
        .from('commerce_events')
        .insert({
          business_id: businessId,
          event_type: 'inventory.reserved',
          source_channel: context.sourceChannel || 'system',
          source_id: orderId,
          payload: {
            orderId,
            locationId,
            items,
          },
          idempotency_key: context.idempotencyKey,
          processing_status: 'completed',
        })
        .select('id')
        .single();

      if (error) {
        return failure(`Failed to reserve inventory: ${error.message}`, {
          errorCode: 'INVENTORY_RESERVE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        eventId: data.id,
        status: 'reserved',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'INVENTORY_RESERVE_ERROR', shouldRetry: true }
      );
    }
  },
});
