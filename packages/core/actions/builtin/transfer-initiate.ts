/**
 * transfer.initiate Action
 *
 * Initiate a remittance transfer.
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

export const transferInitiateAction = defineAction({
  id: 'transfer.initiate',
  category: 'financial',
  description: 'Initiate a remittance transfer',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      employeeId: stringProp('Employee ID (optional)'),
      transferType: stringProp('Transfer type (send, withdraw, deposit)'),
      amount: numberProp('Transfer amount', { minimum: 0.01 }),
      fee: numberProp('Transfer fee', { minimum: 0 }),
      senderPhone: stringProp('Sender phone (optional)'),
      recipientPhone: stringProp('Recipient phone (optional)'),
      recipientName: stringProp('Recipient name (optional)'),
      transactionCode: stringProp('Transaction code (optional)'),
    },
    ['transferType', 'amount', 'fee'],
    'Input for transfer.initiate action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Transfer ID' },
    status: { type: 'string', description: 'Transfer status' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: transfer, error } = await supabase
        .from('remittance_transfers')
        .insert({
          business_id: businessId,
          employee_id: input.employeeId ?? null,
          transfer_type: input.transferType,
          amount: input.amount,
          fee: input.fee,
          sender_phone: input.senderPhone ?? null,
          recipient_phone: input.recipientPhone ?? null,
          recipient_name: input.recipientName ?? null,
          transaction_code: input.transactionCode ?? null,
          status: 'pending',
          kyc_verified: false,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to initiate transfer: ${error.message}`, {
          errorCode: 'TRANSFER_INITIATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: transfer.id,
        status: transfer.status,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'TRANSFER_ERROR', shouldRetry: true }
      );
    }
  },
});
