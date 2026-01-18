import { Router } from 'express';
import { actionRegistry } from '@kenya-commerce-os/core/actions';
import { buildActionContext } from './action-context';

export function createPayrollRouter(): Router {
  const router = Router();

  router.post('/sales', async (req, res) => {
    const action = actionRegistry.get('employee.record_sale');
    if (!action) {
      return res.status(501).json({ error: 'employee.record_sale action not available' });
    }
    const context = buildActionContext(req, 'employee.record_sale');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/payments', async (req, res) => {
    const action = actionRegistry.get('wage.record_payment');
    if (!action) {
      return res.status(501).json({ error: 'wage.record_payment action not available' });
    }
    const context = buildActionContext(req, 'wage.record_payment');
    const result = await action.execute(req.body || {}, context);
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/commissions', async (req, res) => {
    const action = actionRegistry.get('commission.calculate');
    if (!action) {
      return res.status(501).json({ error: 'commission.calculate action not available' });
    }
    const context = buildActionContext(req, 'commission.calculate');
    const { employeeId, periodStart, periodEnd } = req.query;
    const result = await action.execute(
      {
        employeeId,
        periodStart,
        periodEnd,
      },
      context
    );
    return res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/summary', async (req, res) => {
    const action = actionRegistry.get('payroll.generate_summary');
    if (!action) {
      return res.status(501).json({ error: 'payroll.generate_summary action not available' });
    }
    const context = buildActionContext(req, 'payroll.generate_summary');
    const { periodStart, periodEnd } = req.query;
    const result = await action.execute(
      {
        periodStart,
        periodEnd,
      },
      context
    );
    return res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}
