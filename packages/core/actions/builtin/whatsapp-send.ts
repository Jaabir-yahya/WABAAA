/**
 * whatsapp.send Action
 *
 * Send a WhatsApp message using the WhatsApp Cloud API client.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';
import { createWhatsAppClient } from '../../../integrations/whatsapp/client';

let cachedClient: ReturnType<typeof createWhatsAppClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp credentials in environment variables');
  }

  cachedClient = createWhatsAppClient({
    phoneNumberId,
    accessToken,
    apiVersion,
  });

  return cachedClient;
}

export const whatsappSendAction = defineAction({
  id: 'whatsapp.send',
  category: 'communication',
  description: 'Send a WhatsApp message to a phone number',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      to: stringProp('Recipient phone number (254...)'),
      message: stringProp('Message text'),
      template: stringProp('Optional template name'),
      language: stringProp('Template language code', { default: 'sw' }),
    },
    ['to'],
    'Input for whatsapp.send action'
  ),

  outputSchema: objectSchema({
    messageId: { type: 'string', description: 'WhatsApp message ID' },
    status: { type: 'string', description: 'Status: sent or failed' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input) {
    try {
      const to = input.to as string;
      const message = input.message as string | undefined;
      const template = input.template as string | undefined;
      const language = (input.language as string) || 'sw';

      if (!message && !template) {
        return failure('Either message or template must be provided', {
          errorCode: 'INVALID_INPUT',
          shouldRetry: false,
        });
      }

      const client = getClient();

      let result: { success: boolean; messageId?: string; error?: string };

      if (template) {
        result = await client.sendTemplate(to, template, language);
      } else {
        result = await client.sendText(to, message!);
      }

      if (!result.success) {
        return failure(result.error || 'Failed to send WhatsApp message', {
          errorCode: 'WHATSAPP_SEND_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        messageId: result.messageId,
        status: 'sent',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'WHATSAPP_ERROR', shouldRetry: true }
      );
    }
  },
});
