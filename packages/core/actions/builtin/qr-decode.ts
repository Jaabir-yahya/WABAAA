/**
 * qr.decode Action
 *
 * Decode a KCOS QR reference string into metadata.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

export const qrDecodeAction = defineAction({
  id: 'qr.decode',
  category: 'qr',
  description: 'Decode a KCOS QR reference string',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      reference: stringProp('KCOS QR reference string (KCOS:...)'),
    },
    ['reference'],
    'Input for qr.decode action'
  ),

  outputSchema: objectSchema({
    payload: { type: 'object', description: 'Decoded payload' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input) {
    try {
      const reference = input.reference as string;

      if (!reference.startsWith('KCOS:')) {
        return failure('Invalid KCOS reference format', {
          errorCode: 'INVALID_QR_REFERENCE',
          shouldRetry: false,
        });
      }

      const encoded = reference.replace('KCOS:', '');
      const decodedJson = Buffer.from(encoded, 'base64').toString('utf-8');
      const payload = JSON.parse(decodedJson);

      return success({ payload });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'QR_DECODE_FAILED', shouldRetry: false }
      );
    }
  },
});
