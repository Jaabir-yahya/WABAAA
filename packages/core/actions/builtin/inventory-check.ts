/**
 * inventory.check Action
 *
 * Validate item availability against provided inventory snapshot.
 * If inventory is not provided, assumes available (stub for later DB integration).
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

export const inventoryCheckAction = defineAction({
  id: 'inventory.check',
  category: 'inventory',
  description: 'Check item availability against inventory snapshot',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      items: {
        type: 'array',
        description: 'Requested order items',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            sku: { type: 'string' },
          },
        },
      },
      inventorySnapshot: {
        type: 'array',
        description: 'Optional inventory snapshot (product/sku with availableQty)',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            sku: { type: 'string' },
            availableQty: { type: 'number' },
          },
        },
      },
      locationId: stringProp('Location/warehouse identifier (optional)'),
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
    },
    ['items'],
    'Input for inventory.check action'
  ),

  outputSchema: objectSchema({
    allAvailable: { type: 'boolean', description: 'Whether all items are available' },
    availableItems: { type: 'array', description: 'Items that are available', items: { type: 'object', properties: {} } },
    unavailableItems: { type: 'array', description: 'Items that are unavailable', items: { type: 'object', properties: {} } },
    locationId: { type: 'string', description: 'Location checked (if provided)' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const items = (input.items as Array<Record<string, unknown>>) || [];
      const inventory = (input.inventorySnapshot as Array<Record<string, unknown>> | undefined) || [];
      const locationId = input.locationId as string | undefined;
      const businessId = (input.businessId as string) || context.tenantId;

      if (items.length === 0) {
        return failure('No items provided for inventory check', {
          errorCode: 'INVENTORY_NO_ITEMS',
          shouldRetry: false,
        });
      }

      // If inventory snapshot is provided, use it directly.
      if (inventory && inventory.length > 0) {
        const availableItems: Array<Record<string, unknown>> = [];
        const unavailableItems: Array<Record<string, unknown>> = [];

        for (const item of items) {
          const product = item.product as string | undefined;
          const sku = item.sku as string | undefined;
          const quantity = Number(item.quantity ?? 0);

          const match = inventory.find((inv) => {
            const invProduct = inv.product as string | undefined;
            const invSku = inv.sku as string | undefined;
            return (sku && invSku === sku) || (!sku && product && invProduct === product);
          });

          const availableQty = Number(match?.availableQty ?? 0);
          if (match && availableQty >= quantity) {
            availableItems.push(item);
          } else {
            unavailableItems.push({
              ...item,
              availableQty,
            });
          }
        }

        return success({
          allAvailable: unavailableItems.length === 0,
          availableItems,
          unavailableItems,
          locationId,
        });
      }

      // Otherwise, query catalog + inventory batches
      const skus = items.map((item) => item.sku).filter(Boolean) as string[];
      const names = items.map((item) => item.product).filter(Boolean) as string[];

      const productMap = new Map<string, { id: string; sku: string; name: string }>();

      if (skus.length > 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, name')
          .eq('business_id', businessId)
          .in('sku', skus);

        if (error) {
          return failure(`Inventory lookup failed: ${error.message}`, {
            errorCode: 'INVENTORY_PRODUCT_LOOKUP_FAILED',
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
          .select('id, sku, name')
          .eq('business_id', businessId)
          .in('name', names);

        if (error) {
          return failure(`Inventory lookup failed: ${error.message}`, {
            errorCode: 'INVENTORY_PRODUCT_LOOKUP_FAILED',
            shouldRetry: true,
          });
        }

        for (const product of data ?? []) {
          productMap.set(product.name, product);
        }

        const { data: swData, error: swError } = await supabase
          .from('products')
          .select('id, sku, name')
          .eq('business_id', businessId)
          .in('name_sw', names);

        if (swError) {
          return failure(`Inventory lookup failed: ${swError.message}`, {
            errorCode: 'INVENTORY_PRODUCT_LOOKUP_FAILED',
            shouldRetry: true,
          });
        }

        for (const product of swData ?? []) {
          productMap.set(product.name, product);
        }
      }

      const productIds = Array.from(productMap.values()).map((p) => p.id);
      const inventoryByProduct = new Map<string, number>();

      if (productIds.length > 0) {
        let invQuery = supabase
          .from('inventory_batches')
          .select('product_id, quantity_on_hand, quantity_reserved')
          .eq('business_id', businessId)
          .in('product_id', productIds)
          .gte('expiry_date', new Date().toISOString().slice(0, 10));

        if (locationId) {
          invQuery = invQuery.eq('store_id', locationId);
        }

        const { data, error } = await invQuery;
        if (error) {
          return failure(`Inventory batch lookup failed: ${error.message}`, {
            errorCode: 'INVENTORY_BATCH_LOOKUP_FAILED',
            shouldRetry: true,
          });
        }

        for (const row of data ?? []) {
          const availableQty = Number(row.quantity_on_hand ?? 0) - Number(row.quantity_reserved ?? 0);
          const prev = inventoryByProduct.get(row.product_id) ?? 0;
          inventoryByProduct.set(row.product_id, prev + availableQty);
        }
      }

      const availableItems: Array<Record<string, unknown>> = [];
      const unavailableItems: Array<Record<string, unknown>> = [];

      for (const item of items) {
        const product = item.product as string | undefined;
        const sku = item.sku as string | undefined;
        const quantity = Number(item.quantity ?? 0);

        const productRecord = sku ? productMap.get(sku) : product ? productMap.get(product) : undefined;
        const availableQty = productRecord ? inventoryByProduct.get(productRecord.id) ?? 0 : 0;

        if (productRecord && availableQty >= quantity) {
          availableItems.push({ ...item, productId: productRecord.id, availableQty });
        } else {
          unavailableItems.push({ ...item, availableQty });
        }
      }

      return success({
        allAvailable: unavailableItems.length === 0,
        availableItems,
        unavailableItems,
        locationId,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'INVENTORY_CHECK_ERROR', shouldRetry: false }
      );
    }
  },
});
