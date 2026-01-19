import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseWithContext } from './supabase';

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

  router.get('/products', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { data, error } = await supabase.from('products').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ products: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.put('/products/:id', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { id } = req.params;
      const { name, price, stock_quantity, status } = req.body as {
        name?: string;
        price?: number;
        stock_quantity?: number;
        status?: string;
      };

      const { data, error } = await supabase
        .from('products')
        .update({
          name,
          price,
          stock_quantity,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ product: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.delete('/products/:id', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { id } = req.params;

      const { error } = await supabase
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
