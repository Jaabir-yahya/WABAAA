/**
 * product.create Action
 *
 * Create a product in the catalog.
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

export const productCreateAction = defineAction({
  id: 'product.create',
  category: 'catalog',
  description: 'Create a new product in the catalog',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      sku: stringProp('SKU (unique per business)'),
      name: stringProp('Product name'),
      nameSw: stringProp('Swahili product name (optional)'),
      category: stringProp('Product category (optional)'),
      description: stringProp('Product description (optional)'),
      price: numberProp('Price', { minimum: 0 }),
      currency: stringProp('Currency code (default KES)'),
      requiresPrescription: booleanProp('Requires prescription', false),
      isHealthProduct: booleanProp('Health product flag', false),
      active: booleanProp('Active product', true),
      attributes: { type: 'object', description: 'Custom attributes' },
      images: { type: 'array', description: 'Image URLs', items: { type: 'string' } },
    },
    ['sku', 'name', 'price'],
    'Input for product.create action'
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

      const { data, error } = await supabase
        .from('products')
        .insert({
          business_id: businessId,
          sku: input.sku,
          name: input.name,
          name_sw: input.nameSw ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          price: input.price,
          currency: (input.currency as string) || 'KES',
          requires_prescription: input.requiresPrescription ?? false,
          is_health_product: input.isHealthProduct ?? false,
          active: input.active ?? true,
          attributes: input.attributes ?? {},
          images: input.images ?? [],
        })
        .select('id, sku, name, price, currency')
        .single();

      if (error) {
        return failure(`Failed to create product: ${error.message}`, {
          errorCode: 'PRODUCT_CREATE_FAILED',
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
        { errorCode: 'PRODUCT_CREATE_ERROR', shouldRetry: true }
      );
    }
  },
});
