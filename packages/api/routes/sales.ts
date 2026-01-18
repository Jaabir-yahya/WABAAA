import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseClient } from './supabase';

export function createSalesRouter(): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const action = actionRegistry.get('order.create');
    if (!action) {
      return res.status(501).json({ error: 'order.create action not available' });
    }

    const context = buildActionContext(req, 'order.create');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/:orderId/payments', async (req, res) => {
    const action = actionRegistry.get('payment.record');
    if (!action) {
      return res.status(501).json({ error: 'payment.record action not available' });
    }

    const context = buildActionContext(req, 'payment.record');
    const input = { ...req.body, orderId: req.params.orderId };
    const result = await action.execute(input, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/', async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { status, limit = '50' } = req.query;
      const query = supabase.from('orders').select('*').limit(Number(limit));
      if (status) {
        query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.json({ orders: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
