/**
 * product.update Action
 *
 * Update a product in the catalog.
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

export const productUpdateAction = defineAction({
  id: 'product.update',
  category: 'catalog',
  description: 'Update an existing product in the catalog',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      productId: stringProp('Product ID (optional if sku provided)'),
      sku: stringProp('SKU (optional if productId provided)'),
      name: stringProp('Product name (optional)'),
      nameSw: stringProp('Swahili product name (optional)'),
      category: stringProp('Product category (optional)'),
      description: stringProp('Product description (optional)'),
      price: numberProp('Price (optional)', { minimum: 0 }),
      currency: stringProp('Currency code (optional)'),
      requiresPrescription: booleanProp('Requires prescription (optional)'),
      isHealthProduct: booleanProp('Health product flag (optional)'),
      active: booleanProp('Active product (optional)'),
      attributes: { type: 'object', description: 'Custom attributes (optional)' },
      images: { type: 'array', description: 'Image URLs (optional)', items: { type: 'string' } },
    },
    [],
    'Input for product.update action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Product ID' },
    sku: { type: 'string', description: 'SKU' },
    name: { type: 'string', description: 'Product name' },
    price: { type: 'number', description: 'Price' },
    currency: { type: 'string', description: 'Currency' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const productId = input.productId as string | undefined;
      const sku = input.sku as string | undefined;

      if (!productId && !sku) {
        return failure('Missing productId or sku', {
          errorCode: 'PRODUCT_UPDATE_MISSING_ID',
          shouldRetry: false,
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.nameSw !== undefined) updates.name_sw = input.nameSw;
      if (input.category !== undefined) updates.category = input.category;
      if (input.description !== undefined) updates.description = input.description;
      if (input.price !== undefined) updates.price = input.price;
      if (input.currency !== undefined) updates.currency = input.currency;
      if (input.requiresPrescription !== undefined) updates.requires_prescription = input.requiresPrescription;
      if (input.isHealthProduct !== undefined) updates.is_health_product = input.isHealthProduct;
      if (input.active !== undefined) updates.active = input.active;
      if (input.attributes !== undefined) updates.attributes = input.attributes;
      if (input.images !== undefined) updates.images = input.images;

      if (Object.keys(updates).length === 0) {
        return failure('No updates provided', {
          errorCode: 'PRODUCT_UPDATE_NO_FIELDS',
          shouldRetry: false,
        });
      }

      let query = supabase
        .from('products')
        .update(updates)
        .eq('business_id', businessId);

      if (productId) {
        query = query.eq('id', productId);
      } else if (sku) {
        query = query.eq('sku', sku);
      }

      const { data, error } = await query
        .select('id, sku, name, price, currency')
        .single();

      if (error) {
        return failure(`Failed to update product: ${error.message}`, {
          errorCode: 'PRODUCT_UPDATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: data.id,
        sku: data.sku,
        name: data.name,
        price: data.price,
        currency: data.currency,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'PRODUCT_UPDATE_ERROR', shouldRetry: true }
      );
    }
  },
});
