import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';

export function createRemittanceRouter(): Router {
  const router = Router();

  router.post('/transfers', async (req, res) => {
    const action = actionRegistry.get('transfer.initiate');
    if (!action) {
      return res.status(501).json({ error: 'transfer.initiate action not available' });
    }
    const context = buildActionContext(req, 'transfer.initiate');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/transfers/:transferId/verify', async (req, res) => {
    const action = actionRegistry.get('transfer.verify');
    if (!action) {
      return res.status(501).json({ error: 'transfer.verify action not available' });
    }
    const context = buildActionContext(req, 'transfer.verify');
    const input = { transferId: req.params.transferId, ...req.body };
    const result = await action.execute(input, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/kyc', async (req, res) => {
    const action = actionRegistry.get('kyc.check');
    if (!action) {
      return res.status(501).json({ error: 'kyc.check action not available' });
    }
    const context = buildActionContext(req, 'kyc.check');
    const result = await action.execute({ phone: req.query.phone }, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/float', async (req, res) => {
    const action = actionRegistry.get('float.check');
    if (!action) {
      return res.status(501).json({ error: 'float.check action not available' });
    }
    const context = buildActionContext(req, 'float.check');
    const result = await action.execute({}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/float', async (req, res) => {
    const action = actionRegistry.get('float.request');
    if (!action) {
      return res.status(501).json({ error: 'float.request action not available' });
    }
    const context = buildActionContext(req, 'float.request');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}
