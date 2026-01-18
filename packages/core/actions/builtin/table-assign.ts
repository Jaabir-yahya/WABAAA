/**
 * table.assign Action
 *
 * Assign an order to a table (placeholder for restaurant workflows).
 */

import { defineAction, success, objectSchema, stringProp } from '../helpers';

export const tableAssignAction = defineAction({
  id: 'table.assign',
  category: 'data',
  description: 'Assign an order to a table',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      orderId: stringProp('Order ID'),
      tableLabel: stringProp('Table label/number'),
    },
    ['orderId', 'tableLabel'],
    'Input for table.assign action'
  ),

  outputSchema: objectSchema({
    orderId: { type: 'string', description: 'Order ID' },
    tableLabel: { type: 'string', description: 'Assigned table label' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input) {
    return success({
      orderId: input.orderId as string,
      tableLabel: input.tableLabel as string,
    });
  },
});
