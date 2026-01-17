/**
 * catalog.browse Action
 *
 * Browse products with optional filters.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp, numberProp, booleanProp } from '../helpers';

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

export const catalogBrowseAction = defineAction({
  id: 'catalog.browse',
  category: 'catalog',
  description: 'Browse products in the catalog',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      category: stringProp('Filter by category (optional)'),
      activeOnly: booleanProp('Only active products', true),
      limit: numberProp('Result limit', { minimum: 1 }),
    },
    [],
    'Input for catalog.browse action'
  ),

  outputSchema: objectSchema({
    products: {
      type: 'array',
      description: 'Products list',
      items: { type: 'object', properties: {} },
    },
    total: { type: 'number', description: 'Returned count' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const category = input.category as string | undefined;
      const activeOnly = (input.activeOnly as boolean | undefined) ?? true;
      const limit = Number(input.limit ?? 20);

      let dbQuery = supabase
        .from('products')
        .select('id, sku, name, name_sw, category, price, currency, active')
        .eq('business_id', businessId)
        .limit(limit);

      if (category) {
        dbQuery = dbQuery.eq('category', category);
      }

      if (activeOnly) {
        dbQuery = dbQuery.eq('active', true);
      }

      const { data, error } = await dbQuery;

      if (error) {
        return failure(`Catalog browse failed: ${error.message}`, {
          errorCode: 'CATALOG_BROWSE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        products: data ?? [],
        total: (data ?? []).length,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'CATALOG_BROWSE_ERROR', shouldRetry: true }
      );
    }
  },
});
