/**
 * supplier.record_purchase Action
 *
 * Record a supplier purchase (usually on credit) and update balance.
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

export const supplierRecordPurchaseAction = defineAction({
  id: 'supplier.record_purchase',
  category: 'financial',
  description: 'Record a supplier purchase and increase outstanding balance',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      supplierId: stringProp('Supplier ID'),
      amount: numberProp('Purchase amount', { minimum: 0.01 }),
      description: stringProp('Purchase description (optional)'),
    },
    ['supplierId', 'amount'],
    'Input for supplier.record_purchase action'
  ),

  outputSchema: objectSchema({
    supplierId: { type: 'string', description: 'Supplier ID' },
    outstandingBalance: { type: 'number', description: 'Updated outstanding balance' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id,outstanding_balance')
        .eq('id', input.supplierId)
        .eq('business_id', businessId)
        .single();

      if (supplierError || !supplier) {
        return failure(`Supplier not found or inaccessible`, {
          errorCode: 'SUPPLIER_NOT_FOUND',
          shouldRetry: false,
        });
      }

      const newBalance = Number(supplier.outstanding_balance || 0) + Number(input.amount);

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ outstanding_balance: newBalance })
        .eq('id', input.supplierId)
        .eq('business_id', businessId);

      if (updateError) {
        return failure(`Failed to update supplier balance: ${updateError.message}`, {
          errorCode: 'SUPPLIER_BALANCE_UPDATE_FAILED',
          shouldRetry: true,
        });
      }

      const { error: txError } = await supabase
        .from('supplier_transactions')
        .insert({
          business_id: businessId,
          supplier_id: input.supplierId,
          transaction_type: 'purchase',
          amount: input.amount,
          description: input.description ?? null,
        });

      if (txError) {
        return failure(`Failed to record supplier transaction: ${txError.message}`, {
          errorCode: 'SUPPLIER_TRANSACTION_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        supplierId: input.supplierId,
        outstandingBalance: newBalance,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'SUPPLIER_ERROR', shouldRetry: true }
      );
    }
  },
});
