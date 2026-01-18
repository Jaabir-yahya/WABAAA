import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';
import { getSupabaseClient } from './supabase';

export function createServicesRouter(): Router {
  const router = Router();

  router.post('/services', async (req, res) => {
    const action = actionRegistry.get('service.create');
    if (!action) {
      return res.status(501).json({ error: 'service.create action not available' });
    }
    const context = buildActionContext(req, 'service.create');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/services', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('services').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ services: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.post('/appointments', async (req, res) => {
    const action = actionRegistry.get('appointment.create');
    if (!action) {
      return res.status(501).json({ error: 'appointment.create action not available' });
    }
    const context = buildActionContext(req, 'appointment.create');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/appointments/:appointmentId/confirm', async (req, res) => {
    const action = actionRegistry.get('appointment.confirm');
    if (!action) {
      return res.status(501).json({ error: 'appointment.confirm action not available' });
    }
    const context = buildActionContext(req, 'appointment.confirm');
    const input = { appointmentId: req.params.appointmentId, ...req.body };
    const result = await action.execute(input, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/appointments', async (_req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('appointments').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ appointments: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
