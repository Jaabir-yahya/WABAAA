/**
 * service.create Action
 *
 * Create a service catalog item.
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

export const serviceCreateAction = defineAction({
  id: 'service.create',
  category: 'data',
  description: 'Create a service catalog item',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      name: stringProp('Service name'),
      nameSw: stringProp('Service name in Swahili (optional)'),
      category: stringProp('Service category (optional)'),
      description: stringProp('Service description (optional)'),
      price: numberProp('Service price', { minimum: 0 }),
      durationMins: numberProp('Service duration in minutes (optional)', { minimum: 1 }),
    },
    ['name', 'price'],
    'Input for service.create action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Service ID' },
    name: { type: 'string', description: 'Service name' },
    price: { type: 'number', description: 'Service price' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: service, error } = await supabase
        .from('services')
        .insert({
          business_id: businessId,
          name: input.name,
          name_sw: input.nameSw ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          price: input.price,
          duration_mins: input.durationMins ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to create service: ${error.message}`, {
          errorCode: 'SERVICE_CREATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: service.id,
        name: service.name,
        price: service.price,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'SERVICE_ERROR', shouldRetry: true }
      );
    }
  },
});
