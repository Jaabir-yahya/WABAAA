/**
 * qr.generate Action
 *
 * Generate a KCOS QR reference with encoded metadata.
 * This does not generate an image; it returns a KCOS:... reference string.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

type QRType = 'product' | 'invoice' | 'shop' | 'menu' | 'access' | 'custom';

export const qrGenerateAction = defineAction({
  id: 'qr.generate',
  category: 'qr',
  description: 'Generate a KCOS QR reference string with metadata',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      type: stringProp('QR type', { enum: ['product', 'invoice', 'shop', 'menu', 'access', 'custom'] }),
      data: {
        type: 'object',
        description: 'Arbitrary metadata to embed in QR',
      },
    },
    ['type'],
    'Input for qr.generate action'
  ),

  outputSchema: objectSchema({
    reference: { type: 'string', description: 'KCOS QR reference string (KCOS:...)' },
    payload: { type: 'object', description: 'Decoded payload used to generate reference' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input, context) {
    try {
      const businessId = (input.businessId as string) || context.tenantId;
      const type = input.type as QRType;
      const data = (input.data as Record<string, unknown>) || {};

      const payload = {
        b: businessId,
        t: type,
        d: data,
        ts: Date.now(),
      };

      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
      const reference = `KCOS:${encoded}`;

      return success({ reference, payload });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'QR_GENERATE_FAILED', shouldRetry: false }
      );
    }
  },
});
