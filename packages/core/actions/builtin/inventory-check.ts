/**
 * inventory.check Action
 *
 * Validate item availability against provided inventory snapshot.
 * If inventory is not provided, assumes available (stub for later DB integration).
 */

import { defineAction, success, failure, objectSchema, stringProp, numberProp } from '../helpers';

export const inventoryCheckAction = defineAction({
  id: 'inventory.check',
  category: 'inventory',
  description: 'Check item availability against inventory snapshot',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      items: {
        type: 'array',
        description: 'Requested order items',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            quantity: { type: 'number' },
            sku: { type: 'string' },
          },
        },
      },
      inventorySnapshot: {
        type: 'array',
        description: 'Optional inventory snapshot (product/sku with availableQty)',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            sku: { type: 'string' },
            availableQty: { type: 'number' },
          },
        },
      },
      locationId: stringProp('Location/warehouse identifier (optional)'),
    },
    ['items'],
    'Input for inventory.check action'
  ),

  outputSchema: objectSchema({
    allAvailable: { type: 'boolean', description: 'Whether all items are available' },
    availableItems: { type: 'array', description: 'Items that are available', items: { type: 'object', properties: {} } },
    unavailableItems: { type: 'array', description: 'Items that are unavailable', items: { type: 'object', properties: {} } },
    locationId: { type: 'string', description: 'Location checked (if provided)' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input) {
    try {
      const items = (input.items as Array<Record<string, unknown>>) || [];
      const inventory = (input.inventorySnapshot as Array<Record<string, unknown>> | undefined) || [];
      const locationId = input.locationId as string | undefined;

      if (items.length === 0) {
        return failure('No items provided for inventory check', {
          errorCode: 'INVENTORY_NO_ITEMS',
          shouldRetry: false,
        });
      }

      // If no inventory snapshot, assume available (placeholder for DB integration)
      if (!inventory || inventory.length === 0) {
        return success({
          allAvailable: true,
          availableItems: items,
          unavailableItems: [],
          locationId,
        });
      }

      const availableItems: Array<Record<string, unknown>> = [];
      const unavailableItems: Array<Record<string, unknown>> = [];

      for (const item of items) {
        const product = item.product as string | undefined;
        const sku = item.sku as string | undefined;
        const quantity = Number(item.quantity ?? 0);

        const match = inventory.find((inv) => {
          const invProduct = inv.product as string | undefined;
          const invSku = inv.sku as string | undefined;
          return (sku && invSku === sku) || (!sku && product && invProduct === product);
        });

        const availableQty = Number(match?.availableQty ?? 0);
        if (match && availableQty >= quantity) {
          availableItems.push(item);
        } else {
          unavailableItems.push({
            ...item,
            availableQty,
          });
        }
      }

      return success({
        allAvailable: unavailableItems.length === 0,
        availableItems,
        unavailableItems,
        locationId,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'INVENTORY_CHECK_ERROR', shouldRetry: false }
      );
    }
  },
});
