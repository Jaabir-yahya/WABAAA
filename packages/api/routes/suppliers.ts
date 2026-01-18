import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseClient } from './supabase';

export function createSuppliersRouter(): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const action = actionRegistry.get('supplier.create');
    if (!action) {
      return res.status(501).json({ error: 'supplier.create action not available' });
    }
    const context = buildActionContext(req, 'supplier.create');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/:supplierId/purchases', async (req, res) => {
    const action = actionRegistry.get('supplier.record_purchase');
    if (!action) {
      return res.status(501).json({ error: 'supplier.record_purchase action not available' });
    }
    const context = buildActionContext(req, 'supplier.record_purchase');
    const input = { ...req.body, supplierId: req.params.supplierId };
    const result = await action.execute(input, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/:supplierId/payments', async (req, res) => {
    const action = actionRegistry.get('supplier.record_payment');
    if (!action) {
      return res.status(501).json({ error: 'supplier.record_payment action not available' });
    }
    const context = buildActionContext(req, 'supplier.record_payment');
    const input = { ...req.body, supplierId: req.params.supplierId };
    const result = await action.execute(input, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('suppliers').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ suppliers: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/:supplierId/debt', async (req, res) => {
    const action = actionRegistry.get('supplier.check_debt');
    if (!action) {
      return res.status(501).json({ error: 'supplier.check_debt action not available' });
    }
    const context = buildActionContext(req, 'supplier.check_debt');
    const result = await action.execute({ supplierId: req.params.supplierId }, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}
