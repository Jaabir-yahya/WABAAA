/**
 * supplier.create Action
 *
 * Create a supplier record.
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

export const supplierCreateAction = defineAction({
  id: 'supplier.create',
  category: 'data',
  description: 'Create a supplier record',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      name: stringProp('Supplier name'),
      phone: stringProp('Supplier phone (optional)'),
      email: stringProp('Supplier email (optional)'),
      paymentTerms: stringProp('Payment terms (optional)'),
      creditLimit: numberProp('Credit limit (optional)'),
    },
    ['name'],
    'Input for supplier.create action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Supplier ID' },
    name: { type: 'string', description: 'Supplier name' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert({
          business_id: businessId,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          payment_terms: input.paymentTerms ?? null,
          credit_limit: input.creditLimit ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to create supplier: ${error.message}`, {
          errorCode: 'SUPPLIER_CREATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: supplier.id,
        name: supplier.name,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'SUPPLIER_ERROR', shouldRetry: true }
      );
    }
  },
});
