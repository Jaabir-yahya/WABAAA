/**
 * sms.send Action
 *
 * Send an SMS message (fallback when WhatsApp fails).
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

export const smsSendAction = defineAction({
  id: 'sms.send',
  category: 'communication',
  description: 'Send an SMS message (fallback channel)',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      to: stringProp('Recipient phone number (254...)'),
      message: stringProp('SMS message text (160 chars max)'),
    },
    ['to', 'message'],
    'Input for sms.send action'
  ),

  outputSchema: objectSchema({
    messageId: { type: 'string', description: 'SMS message ID' },
    status: { type: 'string', description: 'Status: sent or failed' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input) {
    try {
      const to = input.to as string;
      const message = (input.message as string).slice(0, 160);

      if (!to || !message) {
        return failure('Missing SMS recipient or message', {
          errorCode: 'INVALID_INPUT',
          shouldRetry: false,
        });
      }

      // TODO: Integrate Africa's Talking or other SMS provider
      return success({
        messageId: `sms_${Date.now()}`,
        status: 'sent',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'SMS_ERROR', shouldRetry: true }
      );
    }
  },
});
