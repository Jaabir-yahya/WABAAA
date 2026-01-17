/**
 * mpesa.initiate Action
 *
 * Initiate an M-Pesa STK Push payment request.
 */

import { defineAction, success, failure, objectSchema, stringProp, numberProp } from '../helpers';
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

export const mpesaInitiateAction = defineAction({
  id: 'mpesa.initiate',
  category: 'payment',
  description: 'Initiate M-Pesa STK Push payment',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      phone: stringProp('Customer phone number (2547...)', { pattern: '^254[0-9]{9}$' }),
      amount: numberProp('Amount to charge (KES)', { minimum: 1, maximum: 150000 }),
      reference: stringProp('Account reference (order ID)'),
      description: stringProp('Transaction description'),
    },
    ['phone', 'amount', 'reference', 'description'],
    'Input for mpesa.initiate action'
  ),

  outputSchema: objectSchema({
    checkoutRequestId: { type: 'string', description: 'Checkout request ID' },
    merchantRequestId: { type: 'string', description: 'Merchant request ID' },
    status: { type: 'string', description: 'Status: initiated or failed' },
    responseCode: { type: 'string', description: 'M-Pesa response code' },
    responseDescription: { type: 'string', description: 'M-Pesa response description' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input) {
    try {
      const client = getClient();

      const result = await client.stkPush({
        phone: input.phone as string,
        amount: input.amount as number,
        accountReference: input.reference as string,
        transactionDesc: input.description as string,
      });

      if (!result.success) {
        return failure(result.error || 'M-Pesa STK push failed', {
          errorCode: 'MPESA_STK_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        status: 'initiated',
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'MPESA_ERROR', shouldRetry: true }
      );
    }
  },
});
