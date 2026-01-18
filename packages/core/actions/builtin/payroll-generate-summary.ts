/**
 * payroll.generate_summary Action
 *
 * Generate a payroll summary for a period.
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

export const payrollGenerateSummaryAction = defineAction({
  id: 'payroll.generate_summary',
  category: 'financial',
  description: 'Generate a payroll summary for a period',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      periodStart: stringProp('Period start date (YYYY-MM-DD)'),
      periodEnd: stringProp('Period end date (YYYY-MM-DD)'),
    },
    ['periodStart', 'periodEnd'],
    'Input for payroll.generate_summary action'
  ),

  outputSchema: objectSchema({
    employees: {
      type: 'array',
      description: 'Payroll totals per employee',
      items: {
        type: 'object',
        properties: {
          employeeId: { type: 'string' },
          totalSales: { type: 'number' },
          totalCommission: { type: 'number' },
        },
      },
    },
    grandTotal: { type: 'number', description: 'Total commission payout' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: sales, error } = await supabase
        .from('employee_sales')
        .select('employee_id,sale_amount,commission_rate,commission_amount,created_at')
        .eq('business_id', businessId)
        .gte('created_at', `${input.periodStart}T00:00:00Z`)
        .lte('created_at', `${input.periodEnd}T23:59:59Z`);

      if (error) {
        return failure(`Failed to generate payroll summary: ${error.message}`, {
          errorCode: 'PAYROLL_SUMMARY_FAILED',
          shouldRetry: true,
        });
      }

      const totals = new Map<
        string,
        { totalSales: number; totalCommission: number }
      >();

      for (const sale of sales || []) {
        const employeeId = sale.employee_id as string;
        const saleAmount = Number(sale.sale_amount || 0);
        const commissionAmount =
          sale.commission_amount !== null && sale.commission_amount !== undefined
            ? Number(sale.commission_amount)
            : (saleAmount * Number(sale.commission_rate || 0)) / 100;

        const current = totals.get(employeeId) || { totalSales: 0, totalCommission: 0 };
        current.totalSales += saleAmount;
        current.totalCommission += commissionAmount;
        totals.set(employeeId, current);
      }

      const employees = Array.from(totals.entries()).map(([employeeId, totals]) => ({
        employeeId,
        totalSales: totals.totalSales,
        totalCommission: totals.totalCommission,
      }));

      const grandTotal = employees.reduce((sum, employee) => sum + employee.totalCommission, 0);

      return success({ employees, grandTotal });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'PAYROLL_ERROR', shouldRetry: true }
      );
    }
  },
});
