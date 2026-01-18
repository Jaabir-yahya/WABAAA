/**
 * float.request Action
 *
 * Request or top up agent float balance.
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

export const floatRequestAction = defineAction({
  id: 'float.request',
  category: 'financial',
  description: 'Request or top up agent float balance',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      amount: numberProp('Amount to add to float', { minimum: 0.01 }),
    },
    ['amount'],
    'Input for float.request action'
  ),

  outputSchema: objectSchema({
    availableBalance: { type: 'number', description: 'Updated available float' },
    committedBalance: { type: 'number', description: 'Committed float' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: float, error: fetchError } = await supabase
        .from('agent_float')
        .select('available_balance,committed_balance')
        .eq('business_id', businessId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return failure(`Failed to fetch float: ${fetchError.message}`, {
          errorCode: 'FLOAT_FETCH_FAILED',
          shouldRetry: true,
        });
      }

      const availableBalance = (float?.available_balance ?? 0) + Number(input.amount);
      const committedBalance = float?.committed_balance ?? 0;

      const { error: upsertError } = await supabase
        .from('agent_float')
        .upsert(
          {
            business_id: businessId,
            available_balance: availableBalance,
            committed_balance: committedBalance,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'business_id' }
        );

      if (upsertError) {
        return failure(`Failed to update float: ${upsertError.message}`, {
          errorCode: 'FLOAT_UPDATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        availableBalance,
        committedBalance,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'FLOAT_ERROR', shouldRetry: true }
      );
    }
  },
});
