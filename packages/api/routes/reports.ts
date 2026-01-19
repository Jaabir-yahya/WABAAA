import { Router } from 'express';
import { getSupabaseWithContext } from './supabase';

export function createReportsRouter(): Router {
  const router = Router();

  router.get('/daily', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { data, error } = await supabase
        .from('public.daily_revenue')
        .select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ dailyRevenue: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/profit-loss', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { data, error } = await supabase
        .from('public.profit_loss_current_month')
        .select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ profitLoss: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
