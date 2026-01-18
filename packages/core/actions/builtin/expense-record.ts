/**
 * expense.record Action
 *
 * Record a business expense in the expenses table.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  defineAction,
  success,
  failure,
  objectSchema,
  stringProp,
  numberProp,
} from '../helpers';

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

export const expenseRecordAction = defineAction({
  id: 'expense.record',
  category: 'financial',
  description: 'Record a business expense',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      amount: numberProp('Expense amount', { minimum: 0.01 }),
      category: stringProp('Expense category (e.g., cogs, rent, utilities, wages, transport, other)'),
      description: stringProp('Expense description'),
      paymentMethod: stringProp('Payment method (mpesa, cash, bank)'),
      expenseDate: stringProp('Expense date (YYYY-MM-DD)', { format: 'date' }),
      supplierId: stringProp('Supplier ID (optional)'),
      employeeId: stringProp('Employee ID (optional)'),
      receiptUrl: stringProp('Receipt URL (optional)'),
    },
    ['amount', 'category', 'description', 'paymentMethod', 'expenseDate'],
    'Input for expense.record action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Expense ID' },
    amount: { type: 'number', description: 'Expense amount' },
    category: { type: 'string', description: 'Expense category' },
    expenseDate: { type: 'string', description: 'Expense date' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          business_id: businessId,
          amount: input.amount,
          category: input.category,
          description: input.description,
          payment_method: input.paymentMethod,
          expense_date: input.expenseDate,
          supplier_id: input.supplierId ?? null,
          employee_id: input.employeeId ?? null,
          receipt_url: input.receiptUrl ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to record expense: ${error.message}`, {
          errorCode: 'EXPENSE_RECORD_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        expenseDate: expense.expense_date,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'EXPENSE_ERROR', shouldRetry: true }
      );
    }
  },
});
