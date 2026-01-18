/**
 * wage.record_payment Action
 *
 * Record an employee wage payment.
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

export const wageRecordPaymentAction = defineAction({
  id: 'wage.record_payment',
  category: 'financial',
  description: 'Record an employee wage payment',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      employeeId: stringProp('Employee ID'),
      periodStart: stringProp('Pay period start date (YYYY-MM-DD)'),
      periodEnd: stringProp('Pay period end date (YYYY-MM-DD)'),
      baseWage: numberProp('Base wage amount', { minimum: 0 }),
      commissionTotal: numberProp('Commission total (optional)', { minimum: 0 }),
      totalPaid: numberProp('Total paid amount', { minimum: 0 }),
      paymentMethod: stringProp('Payment method (optional)'),
      paymentDate: stringProp('Payment date (YYYY-MM-DD)', { format: 'date' }),
    },
    ['employeeId', 'periodStart', 'periodEnd', 'totalPaid', 'paymentDate'],
    'Input for wage.record_payment action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Wage payment ID' },
    employeeId: { type: 'string', description: 'Employee ID' },
    totalPaid: { type: 'number', description: 'Total paid amount' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: payment, error } = await supabase
        .from('wage_payments')
        .insert({
          business_id: businessId,
          employee_id: input.employeeId,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          base_wage: input.baseWage ?? null,
          commission_total: input.commissionTotal ?? null,
          total_paid: input.totalPaid,
          payment_method: input.paymentMethod ?? null,
          payment_date: input.paymentDate,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to record wage payment: ${error.message}`, {
          errorCode: 'WAGE_PAYMENT_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: payment.id,
        employeeId: payment.employee_id,
        totalPaid: payment.total_paid,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'WAGE_PAYMENT_ERROR', shouldRetry: true }
      );
    }
  },
});
