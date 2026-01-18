/**
 * cash.reconcile Action
 *
 * Record daily cash reconciliation for a business.
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

export const cashReconcileAction = defineAction({
  id: 'cash.reconcile',
  category: 'financial',
  description: 'Record daily cash reconciliation',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      locationId: stringProp('Location ID (optional)'),
      date: stringProp('Reconciliation date (YYYY-MM-DD)'),
      openingBalance: numberProp('Opening cash balance', { minimum: 0 }),
      actualClosing: numberProp('Actual closing cash', { minimum: 0 }),
      notes: stringProp('Optional notes'),
    },
    ['date', 'openingBalance', 'actualClosing'],
    'Input for cash.reconcile action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Reconciliation ID' },
    expectedClosing: { type: 'number', description: 'Expected closing cash' },
    variance: { type: 'number', description: 'Variance between actual and expected' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const start = `${input.date}T00:00:00`;
      const end = `${input.date}T23:59:59`;

      const { data: cashPayments, error: cashError } = await supabase
        .from('payments')
        .select('amount')
        .eq('business_id', businessId)
        .eq('method', 'cash')
        .gte('created_at', start)
        .lte('created_at', end);

      if (cashError) {
        return failure(`Failed to fetch cash payments: ${cashError.message}`, {
          errorCode: 'CASH_PAYMENTS_FETCH_FAILED',
          shouldRetry: true,
        });
      }

      const expectedCashSales = (cashPayments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

      const { data: cashExpenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .eq('payment_method', 'cash')
        .gte('expense_date', input.date)
        .lte('expense_date', input.date);

      if (expenseError) {
        return failure(`Failed to fetch cash expenses: ${expenseError.message}`, {
          errorCode: 'CASH_EXPENSES_FETCH_FAILED',
          shouldRetry: true,
        });
      }

      const expectedExpenses = (cashExpenses || []).reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      );

      const { data: reconciliation, error: insertError } = await supabase
        .from('cash_reconciliations')
        .upsert(
          {
            business_id: businessId,
            location_id: input.locationId ?? null,
            opening_date: input.date,
            opening_balance: input.openingBalance,
            expected_cash_sales: expectedCashSales,
            expected_expenses: expectedExpenses,
            actual_closing: input.actualClosing,
            reconciled_at: new Date().toISOString(),
            notes: input.notes ?? null,
          },
          { onConflict: 'business_id,opening_date,location_id' }
        )
        .select('*')
        .single();

      if (insertError) {
        return failure(`Failed to record reconciliation: ${insertError.message}`, {
          errorCode: 'CASH_RECONCILE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: reconciliation.id,
        expectedClosing: reconciliation.expected_closing,
        variance: reconciliation.variance,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'CASH_RECONCILE_ERROR', shouldRetry: true }
      );
    }
  },
});
