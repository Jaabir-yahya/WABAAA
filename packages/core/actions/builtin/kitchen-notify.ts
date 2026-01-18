/**
 * kitchen.notify Action
 *
 * Notify kitchen about a new order (placeholder for integrations).
 */

import { defineAction, success, objectSchema, stringProp } from '../helpers';

export const kitchenNotifyAction = defineAction({
  id: 'kitchen.notify',
  category: 'notification',
  description: 'Notify kitchen about a new order',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      orderId: stringProp('Order ID'),
      message: stringProp('Kitchen message'),
      channel: stringProp('Notification channel (optional)'),
    },
    ['orderId', 'message'],
    'Input for kitchen.notify action'
  ),

  outputSchema: objectSchema({
    notified: { type: 'boolean', description: 'Whether notification was sent' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input) {
    return success({
      notified: true,
      orderId: input.orderId as string,
      channel: (input.channel as string) || 'internal',
    });
  },
});
