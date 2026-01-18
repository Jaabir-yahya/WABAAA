/**
 * transfer.verify Action
 *
 * Verify or update a remittance transfer status.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp, booleanProp } from '../helpers';

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

export const transferVerifyAction = defineAction({
  id: 'transfer.verify',
  category: 'financial',
  description: 'Verify or update transfer status',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      transferId: stringProp('Transfer ID'),
      status: stringProp('Transfer status (verified, completed, failed)'),
      kycVerified: booleanProp('Whether KYC is verified (optional)'),
    },
    ['transferId', 'status'],
    'Input for transfer.verify action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Transfer ID' },
    status: { type: 'string', description: 'Updated status' },
    kycVerified: { type: 'boolean', description: 'KYC verified' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: transfer, error } = await supabase
        .from('remittance_transfers')
        .update({
          status: input.status,
          kyc_verified: input.kycVerified ?? null,
        })
        .eq('id', input.transferId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to verify transfer: ${error.message}`, {
          errorCode: 'TRANSFER_VERIFY_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: transfer.id,
        status: transfer.status,
        kycVerified: transfer.kyc_verified ?? false,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'TRANSFER_ERROR', shouldRetry: true }
      );
    }
  },
});
