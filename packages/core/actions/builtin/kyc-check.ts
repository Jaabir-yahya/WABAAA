/**
 * kyc.check Action
 *
 * Check KYC status based on previous transfers for a phone number.
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

export const kycCheckAction = defineAction({
  id: 'kyc.check',
  category: 'compliance',
  description: 'Check KYC status for a phone number',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      phone: stringProp('Phone number to check'),
    },
    ['phone'],
    'Input for kyc.check action'
  ),

  outputSchema: objectSchema({
    phone: { type: 'string', description: 'Phone number checked' },
    kycVerified: { type: 'boolean', description: 'KYC verification status' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: transfers, error } = await supabase
        .from('remittance_transfers')
        .select('kyc_verified')
        .eq('business_id', businessId)
        .or(`sender_phone.eq.${input.phone},recipient_phone.eq.${input.phone}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return failure(`Failed to check KYC: ${error.message}`, {
          errorCode: 'KYC_CHECK_FAILED',
          shouldRetry: true,
        });
      }

      const kycVerified = transfers && transfers.length > 0 ? !!transfers[0].kyc_verified : false;

      return success({
        phone: input.phone,
        kycVerified,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'KYC_ERROR', shouldRetry: true }
      );
    }
  },
});
