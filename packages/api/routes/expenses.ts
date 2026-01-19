import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseWithContext } from './supabase';

export function createExpensesRouter(): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const action = actionRegistry.get('expense.record');
    if (!action) {
      return res.status(501).json({ error: 'expense.record action not available' });
    }

    const context = buildActionContext(req, 'expense.record');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { from, to, category, limit = '50' } = req.query;
      const query = supabase.from('expenses').select('*').limit(Number(limit));
      if (from) query.gte('expense_date', String(from));
      if (to) query.lte('expense_date', String(to));
      if (category) query.eq('category', String(category));
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ expenses: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { from, to } = req.query;
      const query = supabase
        .from('expenses')
        .select('category, amount');
      if (from) query.gte('expense_date', String(from));
      if (to) query.lte('expense_date', String(to));
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      const summary = (data || []).reduce<Record<string, number>>((acc, row) => {
        const key = row.category as string;
        acc[key] = (acc[key] || 0) + Number(row.amount || 0);
        return acc;
      }, {});

      return res.json({ summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
