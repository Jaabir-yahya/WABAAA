import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseClient } from './supabase';

export function createInventoryRouter(): Router {
  const router = Router();

  router.get('/stock', async (req, res) => {
    const action = actionRegistry.get('inventory.check');
    if (!action) {
      return res.status(501).json({ error: 'inventory.check action not available' });
    }
    const context = buildActionContext(req, 'inventory.check');
    const result = await action.execute(req.query || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/products', async (req, res) => {
    const action = actionRegistry.get('product.create');
    if (!action) {
      return res.status(501).json({ error: 'product.create action not available' });
    }
    const context = buildActionContext(req, 'product.create');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/products', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('products').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ products: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
