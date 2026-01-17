/**
 * mpesa.verify Action
 *
 * Verify status of an M-Pesa STK Push payment.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';
import { createMPesaClient } from '../../../integrations/mpesa/client';

let cachedClient: ReturnType<typeof createMPesaClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const environment = (process.env.MPESA_ENV as 'sandbox' | 'production') || 'sandbox';

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    throw new Error('Missing M-Pesa credentials in environment variables');
  }

  cachedClient = createMPesaClient({
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
    environment,
  });

  return cachedClient;
}

export const mpesaVerifyAction = defineAction({
  id: 'mpesa.verify',
  category: 'payment',
  description: 'Verify M-Pesa STK Push payment status',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      checkoutRequestId: stringProp('Checkout request ID to verify'),
    },
    ['checkoutRequestId'],
    'Input for mpesa.verify action'
  ),

  outputSchema: objectSchema({
    status: { type: 'string', description: 'success, failed, or pending' },
    resultCode: { type: 'string', description: 'M-Pesa result code' },
    resultDesc: { type: 'string', description: 'M-Pesa result description' },
    checkoutRequestId: { type: 'string', description: 'Checkout request ID' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input) {
    try {
      const client = getClient();
      const checkoutRequestId = input.checkoutRequestId as string;

      const result = await client.queryStkStatus(checkoutRequestId);

      if (result.error) {
        return failure(result.error, {
          errorCode: 'MPESA_QUERY_FAILED',
          shouldRetry: true,
        });
      }

      const resultCode = String(result.ResultCode);
      const resultDesc = String(result.ResultDesc || '');

      let status: 'success' | 'failed' | 'pending' = 'pending';
      if (resultCode === '0') status = 'success';
      if (resultCode !== '0' && resultCode !== '1032') status = 'failed';

      return success({
        status,
        resultCode,
        resultDesc,
        checkoutRequestId,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'MPESA_ERROR', shouldRetry: true }
      );
    }
  },
});
