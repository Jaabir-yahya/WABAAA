/**
 * price.calculate Action
 *
 * Calculate pricing totals based on items, discounts, and tax.
 */

import { defineAction, success, failure, objectSchema, numberProp, stringProp } from '../helpers';

export const priceCalculateAction = defineAction({
  id: 'price.calculate',
  category: 'data',
  description: 'Calculate order totals with discounts and tax',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      items: {
        type: 'array',
        description: 'Items with price and quantity',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
          },
        },
      },
      discountRate: numberProp('Discount rate (0-1)', { minimum: 0, maximum: 1 }),
      discountAmount: numberProp('Absolute discount amount', { minimum: 0 }),
      taxRate: numberProp('Tax rate (0-1)', { minimum: 0, maximum: 1 }),
      fees: numberProp('Additional fees', { minimum: 0 }),
      currency: stringProp('Currency code (default KES)'),
      segment: stringProp('Customer segment (VIP/LOYAL/NEW)'),
    },
    ['items'],
    'Input for price.calculate action'
  ),

  outputSchema: objectSchema({
    subtotal: { type: 'number', description: 'Subtotal before discounts and tax' },
    discount: { type: 'number', description: 'Discount applied' },
    tax: { type: 'number', description: 'Tax amount' },
    fees: { type: 'number', description: 'Additional fees' },
    total: { type: 'number', description: 'Final total amount' },
    currency: { type: 'string', description: 'Currency code' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input) {
    try {
      const items = (input.items as Array<Record<string, unknown>>) || [];
      if (items.length === 0) {
        return failure('No items provided for price calculation', {
          errorCode: 'PRICE_NO_ITEMS',
          shouldRetry: false,
        });
      }

      const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.price ?? 0);
        return sum + qty * price;
      }, 0);

      const discountRate = Number(input.discountRate ?? 0);
      const discountAmount = Number(input.discountAmount ?? 0);
      const discountFromRate = subtotal * discountRate;
      const discount = Math.min(subtotal, discountFromRate + discountAmount);

      const taxableAmount = Math.max(0, subtotal - discount);
      const taxRate = Number(input.taxRate ?? 0);
      const tax = taxableAmount * taxRate;
      const fees = Number(input.fees ?? 0);

      const total = Math.max(0, taxableAmount + tax + fees);

      return success({
        subtotal,
        discount,
        tax,
        fees,
        total,
        currency: (input.currency as string) || 'KES',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'PRICE_CALC_ERROR', shouldRetry: false }
      );
    }
  },
});
