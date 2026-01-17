/**
 * catalog.resolve_items Action
 *
 * Resolve order items against the catalog to attach pricing and product IDs.
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

export const catalogResolveItemsAction = defineAction({
  id: 'catalog.resolve_items',
  category: 'catalog',
  description: 'Resolve items against catalog and attach price/product_id',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      items: {
        type: 'array',
        description: 'Items to resolve',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            sku: { type: 'string' },
            quantity: { type: 'number' },
          },
        },
      },
    },
    ['items'],
    'Input for catalog.resolve_items action'
  ),

  outputSchema: objectSchema({
    items: { type: 'array', description: 'Resolved items', items: { type: 'object', properties: {} } },
    missingItems: { type: 'array', description: 'Unresolved items', items: { type: 'object', properties: {} } },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const items = (input.items as Array<Record<string, unknown>>) || [];

      if (items.length === 0) {
        return failure('No items provided', {
          errorCode: 'CATALOG_RESOLVE_NO_ITEMS',
          shouldRetry: false,
        });
      }

      const skus = items.map((item) => item.sku).filter(Boolean) as string[];
      const names = items.map((item) => item.product).filter(Boolean) as string[];

      const productMap = new Map<string, { id: string; sku: string; name: string; price: number; currency: string }>();

      if (skus.length > 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, name, price, currency')
          .eq('business_id', businessId)
          .in('sku', skus);

        if (error) {
          return failure(`Catalog resolve failed: ${error.message}`, {
            errorCode: 'CATALOG_RESOLVE_FAILED',
            shouldRetry: true,
          });
        }

        for (const product of data ?? []) {
          productMap.set(product.sku, product);
        }
      }

      if (names.length > 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, name, price, currency')
          .eq('business_id', businessId)
          .in('name', names);

        if (error) {
          return failure(`Catalog resolve failed: ${error.message}`, {
            errorCode: 'CATALOG_RESOLVE_FAILED',
            shouldRetry: true,
          });
        }

        for (const product of data ?? []) {
          productMap.set(product.name, product);
        }
      }

      const resolved: Array<Record<string, unknown>> = [];
      const missing: Array<Record<string, unknown>> = [];

      for (const item of items) {
        const sku = item.sku as string | undefined;
        const product = item.product as string | undefined;
        const match = sku ? productMap.get(sku) : product ? productMap.get(product) : undefined;

        if (match) {
          resolved.push({
            ...item,
            productId: match.id,
            sku: match.sku,
            product: match.name,
            price: match.price,
            currency: match.currency,
          });
        } else {
          missing.push(item);
        }
      }

      return success({
        items: resolved,
        missingItems: missing,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'CATALOG_RESOLVE_ERROR', shouldRetry: true }
      );
    }
  },
});
