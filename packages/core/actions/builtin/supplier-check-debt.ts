/**
 * supplier.check_debt Action
 *
 * Fetch supplier outstanding balance(s).
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

export const supplierCheckDebtAction = defineAction({
  id: 'supplier.check_debt',
  category: 'financial',
  description: 'Check supplier debt balance(s)',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      supplierId: stringProp('Supplier ID (optional, returns all if omitted)'),
    },
    [],
    'Input for supplier.check_debt action'
  ),

  outputSchema: objectSchema({
    suppliers: {
      type: 'array',
      description: 'Supplier balances',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          outstandingBalance: { type: 'number' },
        },
      },
    },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const query = supabase
        .from('suppliers')
        .select('id,name,outstanding_balance')
        .eq('business_id', businessId);

      if (input.supplierId) {
        query.eq('id', input.supplierId);
      }

      const { data: suppliers, error } = await query;

      if (error) {
        return failure(`Failed to fetch supplier debt: ${error.message}`, {
          errorCode: 'SUPPLIER_DEBT_FETCH_FAILED',
          shouldRetry: true,
        });
      }

      const results = (suppliers || []).map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        outstandingBalance: supplier.outstanding_balance ?? 0,
      }));

      return success({ suppliers: results });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'SUPPLIER_ERROR', shouldRetry: true }
      );
    }
  },
});
