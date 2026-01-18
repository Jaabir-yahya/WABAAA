/**
 * commission.calculate Action
 *
 * Calculate commissions for an employee or all employees in a period.
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

export const commissionCalculateAction = defineAction({
  id: 'commission.calculate',
  category: 'financial',
  description: 'Calculate commissions for a given period',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      employeeId: stringProp('Employee ID (optional, returns all if omitted)'),
      periodStart: stringProp('Period start date (YYYY-MM-DD)'),
      periodEnd: stringProp('Period end date (YYYY-MM-DD)'),
    },
    ['periodStart', 'periodEnd'],
    'Input for commission.calculate action'
  ),

  outputSchema: objectSchema({
    commissions: {
      type: 'array',
      description: 'Commission totals',
      items: {
        type: 'object',
        properties: {
          employeeId: { type: 'string' },
          totalSales: { type: 'number' },
          totalCommission: { type: 'number' },
        },
      },
    },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const query = supabase
        .from('employee_sales')
        .select('employee_id,sale_amount,commission_rate,commission_amount,created_at')
        .eq('business_id', businessId)
        .gte('created_at', `${input.periodStart}T00:00:00Z`)
        .lte('created_at', `${input.periodEnd}T23:59:59Z`);

      if (input.employeeId) {
        query.eq('employee_id', input.employeeId);
      }

      const { data: sales, error } = await query;

      if (error) {
        return failure(`Failed to calculate commissions: ${error.message}`, {
          errorCode: 'COMMISSION_CALC_FAILED',
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

      const commissions = Array.from(totals.entries()).map(([employeeId, totals]) => ({
        employeeId,
        totalSales: totals.totalSales,
        totalCommission: totals.totalCommission,
      }));

      return success({ commissions });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'COMMISSION_ERROR', shouldRetry: true }
      );
    }
  },
});
