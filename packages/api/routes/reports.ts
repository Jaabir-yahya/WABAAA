import { Router } from 'express';
import { getSupabaseClient } from './supabase';

export function createReportsRouter(): Router {
  const router = Router();

  router.get('/daily', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('daily_revenue').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ dailyRevenue: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/profit-loss', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('profit_loss_current_month').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ profitLoss: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
