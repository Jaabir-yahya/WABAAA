/**
 * menu.update Action
 *
 * Update a menu item record.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  defineAction,
  success,
  failure,
  objectSchema,
  stringProp,
  numberProp,
  booleanProp,
} from '../helpers';

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedSupabase = createClient(url, serviceKey);
  return cachedSupabase;
}

export const menuUpdateAction = defineAction({
  id: 'menu.update',
  category: 'data',
  description: 'Update a menu item',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      menuItemId: stringProp('Menu item ID'),
      name: stringProp('Menu item name (optional)'),
      price: numberProp('Menu item price (optional)', { minimum: 0 }),
      category: stringProp('Category (optional)'),
      active: booleanProp('Active status (optional)'),
    },
    ['menuItemId'],
    'Input for menu.update action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Menu item ID' },
    name: { type: 'string', description: 'Menu item name' },
    price: { type: 'number', description: 'Menu item price' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.price !== undefined) updates.price = input.price;
      if (input.category !== undefined) updates.category = input.category;
      if (input.active !== undefined) updates.active = input.active;

      const { data: menuItem, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', input.menuItemId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to update menu item: ${error.message}`, {
          errorCode: 'MENU_UPDATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'MENU_ERROR', shouldRetry: true }
      );
    }
  },
});
