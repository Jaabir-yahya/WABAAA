/**
 * employee.record_sale Action
 *
 * Record a sale attributed to an employee.
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

export const employeeRecordSaleAction = defineAction({
  id: 'employee.record_sale',
  category: 'financial',
  description: 'Record a sale attributed to an employee',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      employeeId: stringProp('Employee ID'),
      orderId: stringProp('Order ID'),
      saleAmount: numberProp('Sale amount', { minimum: 0.01 }),
      commissionRate: numberProp('Commission rate percentage (optional)'),
    },
    ['employeeId', 'orderId', 'saleAmount'],
    'Input for employee.record_sale action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Employee sale record ID' },
    commissionAmount: { type: 'number', description: 'Commission amount' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const commissionRate = input.commissionRate ?? null;
      const commissionAmount =
        commissionRate !== null && commissionRate !== undefined
          ? (Number(input.saleAmount) * Number(commissionRate)) / 100
          : null;

      const { data: sale, error } = await supabase
        .from('employee_sales')
        .insert({
          business_id: businessId,
          employee_id: input.employeeId,
          order_id: input.orderId,
          sale_amount: input.saleAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to record employee sale: ${error.message}`, {
          errorCode: 'EMPLOYEE_SALE_RECORD_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: sale.id,
        commissionAmount: sale.commission_amount ?? 0,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'EMPLOYEE_SALE_ERROR', shouldRetry: true }
      );
    }
  },
});
