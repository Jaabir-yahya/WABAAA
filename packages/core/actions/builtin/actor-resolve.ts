/**
 * actor.resolve Action
 *
 * Resolve a customer/actor by phone number, creating a profile if needed.
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

export const actorResolveAction = defineAction({
  id: 'actor.resolve',
  category: 'identity',
  description: 'Resolve or create a customer/actor by phone number',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      phone: stringProp('Customer phone number'),
    },
    ['phone'],
    'Input for actor.resolve action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Customer profile ID' },
    phone: { type: 'string', description: 'Customer phone number' },
    isNew: { type: 'boolean', description: 'Whether the actor was newly created' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const phone = input.phone as string;

      // Try to find existing profile
      const { data: existing, error: selectError } = await supabase
        .from('customer_financial_profiles')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_phone', phone)
        .single();

      if (existing && !selectError) {
        return success({
          id: existing.id,
          phone,
          isNew: false,
        });
      }

      // Insert new profile if not found
      const { data: created, error: insertError } = await supabase
        .from('customer_financial_profiles')
        .insert({
          business_id: businessId,
          customer_phone: phone,
        })
        .select('*')
        .single();

      if (insertError) {
        return failure(`Failed to create customer profile: ${insertError.message}`, {
          errorCode: 'ACTOR_CREATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: created.id,
        phone,
        isNew: true,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'ACTOR_ERROR', shouldRetry: true }
      );
    }
  },
});
