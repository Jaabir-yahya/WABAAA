/**
 * float.check Action
 *
 * Check available agent float balance.
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

export const floatCheckAction = defineAction({
  id: 'float.check',
  category: 'financial',
  description: 'Check agent float balance',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
    },
    [],
    'Input for float.check action'
  ),

  outputSchema: objectSchema({
    availableBalance: { type: 'number', description: 'Available float' },
    committedBalance: { type: 'number', description: 'Committed float' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: float, error } = await supabase
        .from('agent_float')
        .select('available_balance,committed_balance')
        .eq('business_id', businessId)
        .single();

      if (error) {
        return failure(`Failed to check float: ${error.message}`, {
          errorCode: 'FLOAT_CHECK_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        availableBalance: float?.available_balance ?? 0,
        committedBalance: float?.committed_balance ?? 0,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'FLOAT_ERROR', shouldRetry: true }
      );
    }
  },
});
