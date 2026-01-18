/**
 * expense.link_to_supplier Action
 *
 * Link an expense to a supplier record.
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

export const expenseLinkToSupplierAction = defineAction({
  id: 'expense.link_to_supplier',
  category: 'financial',
  description: 'Link an expense to a supplier',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      expenseId: stringProp('Expense ID'),
      supplierId: stringProp('Supplier ID'),
    },
    ['expenseId', 'supplierId'],
    'Input for expense.link_to_supplier action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Expense ID' },
    supplierId: { type: 'string', description: 'Linked supplier ID' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: expense, error } = await supabase
        .from('expenses')
        .update({ supplier_id: input.supplierId })
        .eq('id', input.expenseId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to link supplier: ${error.message}`, {
          errorCode: 'EXPENSE_LINK_SUPPLIER_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: expense.id,
        supplierId: expense.supplier_id,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'EXPENSE_ERROR', shouldRetry: true }
      );
    }
  },
});
