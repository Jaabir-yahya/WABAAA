/**
 * customer.segment Action
 *
 * Determine customer segment (VIP/LOYAL/NEW) based on purchase history.
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

export const customerSegmentAction = defineAction({
  id: 'customer.segment',
  category: 'identity',
  description: 'Assign a customer segment based on spend and order history',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      customerId: stringProp('Customer profile ID (optional if phone provided)'),
      phone: stringProp('Customer phone number (optional if customerId provided)'),
      vipSpendThreshold: numberProp('Total spend threshold for VIP', { minimum: 0 }),
      loyalOrdersThreshold: numberProp('Total orders threshold for LOYAL', { minimum: 0 }),
    },
    [],
    'Input for customer.segment action'
  ),

  outputSchema: objectSchema({
    segment: { type: 'string', description: 'Assigned segment (VIP/LOYAL/NEW)' },
    totalSpent: { type: 'number', description: 'Total spend for customer' },
    totalOrders: { type: 'number', description: 'Total orders for customer' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;
      const customerId = input.customerId as string | undefined;
      const phone = input.phone as string | undefined;

      if (!customerId && !phone) {
        return failure('Missing customerId or phone', {
          errorCode: 'CUSTOMER_SEGMENT_MISSING_ID',
          shouldRetry: false,
        });
      }

      const vipSpendThreshold = Number(input.vipSpendThreshold ?? 10000);
      const loyalOrdersThreshold = Number(input.loyalOrdersThreshold ?? 3);

      let query = supabase
        .from('customer_financial_profiles')
        .select('total_spent, total_orders, segment')
        .eq('business_id', businessId);

      if (customerId) {
        query = query.eq('id', customerId);
      } else if (phone) {
        query = query.eq('customer_phone', phone);
      }

      const { data: profile, error } = await query.single();

      if (error || !profile) {
        return failure(`Customer profile not found`, {
          errorCode: 'CUSTOMER_PROFILE_NOT_FOUND',
          shouldRetry: false,
        });
      }

      const totalSpent = Number(profile.total_spent ?? 0);
      const totalOrders = Number(profile.total_orders ?? 0);

      let segment = 'NEW';
      if (totalSpent >= vipSpendThreshold) {
        segment = 'VIP';
      } else if (totalOrders >= loyalOrdersThreshold) {
        segment = 'LOYAL';
      }

      return success({
        segment,
        totalSpent,
        totalOrders,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'CUSTOMER_SEGMENT_ERROR', shouldRetry: true }
      );
    }
  },
});
