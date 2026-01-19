/**
 * catalog.search Action
 *
 * Search products by query and filters.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp, numberProp, booleanProp } from '../helpers';

let cachedSupabase: SupabaseClient | null = null;

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&');
}

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

export const catalogSearchAction = defineAction({
  id: 'catalog.search',
  category: 'catalog',
  description: 'Search products in the catalog',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      query: stringProp('Search query (name, sku)'),
      category: stringProp('Filter by category (optional)'),
      activeOnly: booleanProp('Only active products', true),
      limit: numberProp('Result limit', { minimum: 1 }),
    },
    ['query'],
    'Input for catalog.search action'
  ),

  outputSchema: objectSchema({
    products: {
      type: 'array',
      description: 'Matched products',
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
      const query = String(input.query ?? '').trim();
      const category = input.category as string | undefined;
      const activeOnly = (input.activeOnly as boolean | undefined) ?? true;
      const limit = Math.min(Number(input.limit ?? 20), 100);

      if (!query) {
        return failure('Missing search query', {
          errorCode: 'CATALOG_SEARCH_MISSING_QUERY',
          shouldRetry: false,
        });
      }

      const escapedQuery = escapeIlike(query);
      let dbQuery = supabase
        .from('products')
        .select('id, sku, name, name_sw, category, price, currency, active')
        .eq('business_id', businessId)
        .or(
          `name.ilike.%${escapedQuery}%,sku.ilike.%${escapedQuery}%,name_sw.ilike.%${escapedQuery}%`
        )
        .limit(limit);

      if (category) {
        dbQuery = dbQuery.eq('category', category);
      }

      if (activeOnly) {
        dbQuery = dbQuery.eq('active', true);
      }

      const { data, error } = await dbQuery;

      if (error) {
        return failure(`Catalog search failed: ${error.message}`, {
          errorCode: 'CATALOG_SEARCH_FAILED',
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
        { errorCode: 'CATALOG_SEARCH_ERROR', shouldRetry: true }
      );
    }
  },
});
