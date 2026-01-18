/**
 * expense.categorize Action
 *
 * Update the category of an existing expense.
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

export const expenseCategorizeAction = defineAction({
  id: 'expense.categorize',
  category: 'financial',
  description: 'Update the category of an expense',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      expenseId: stringProp('Expense ID'),
      category: stringProp('New expense category'),
    },
    ['expenseId', 'category'],
    'Input for expense.categorize action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Expense ID' },
    category: { type: 'string', description: 'Updated category' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: expense, error } = await supabase
        .from('expenses')
        .update({ category: input.category })
        .eq('id', input.expenseId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to categorize expense: ${error.message}`, {
          errorCode: 'EXPENSE_CATEGORIZE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: expense.id,
        category: expense.category,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'EXPENSE_ERROR', shouldRetry: true }
      );
    }
  },
});
