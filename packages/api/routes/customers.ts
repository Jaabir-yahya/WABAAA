import { Router } from 'express';
import { getSupabaseClient } from './supabase';

export function createCustomersRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('customer_financial_profiles')
        .select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ customers: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/:customerPhone', async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('customer_financial_profiles')
        .select('*')
        .eq('customer_phone', req.params.customerPhone)
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ customer: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
