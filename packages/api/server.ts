/**
 * KCOS API Server
 *
 * Minimal HTTP server to execute workflows.
 */

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { createWorkflowRouter } from './routes/workflows';
import { createSalesRouter } from './routes/sales';
import { createExpensesRouter } from './routes/expenses';
import { createSuppliersRouter } from './routes/suppliers';
import { createPayrollRouter } from './routes/payroll';
import { createInventoryRouter } from './routes/inventory';
import { createServicesRouter } from './routes/services';
import { createCustomersRouter } from './routes/customers';
import { createReportsRouter } from './routes/reports';
import { createRemittanceRouter } from './routes/remittance';
import { requireFeature } from './middleware/tier';
import { requireAuth } from './middleware/auth';
import { apiLimiter } from './middleware/rate-limit';
import {
  actionRegistry,
  registerBuiltinActions,
} from '@kenya-commerce-os/core/actions';
import { WorkflowEngine } from '@kenya-commerce-os/core/workflows';
import { loadWorkflowDefinitionFromString } from '@kenya-commerce-os/core/workflows';
import { WorkflowScheduler } from './scheduler';

// Initialize registry with built-in actions
registerBuiltinActions(actionRegistry);

// Create workflow engine
const engine = new WorkflowEngine({
  actionRegistry,
});

// In-memory workflow definitions and executions
const workflowDefinitions = new Map();
const workflowExecutions = new Map();

// Create express app
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiLimiter);

// Routes
app.use(
  '/api',
  requireAuth,
  createWorkflowRouter({
    engine,
    registry: actionRegistry,
    definitions: workflowDefinitions,
    executions: workflowExecutions,
  })
);
app.use('/api/sales', requireAuth, createSalesRouter());
app.use('/api/expenses', requireAuth, requireFeature('expenses'), createExpensesRouter());
app.use('/api/suppliers', requireAuth, requireFeature('supplier_credit'), createSuppliersRouter());
app.use('/api/payroll', requireAuth, requireFeature('commissions'), createPayrollRouter());
app.use('/api/inventory', requireAuth, requireFeature('inventory'), createInventoryRouter());
app.use('/api/services', requireAuth, requireFeature('appointments'), createServicesRouter());
app.use('/api/customers', requireAuth, createCustomersRouter());
app.use('/api/reports', requireAuth, requireFeature('advanced_reports'), createReportsRouter());
app.use('/api/remittance', requireAuth, requireFeature('remittance'), createRemittanceRouter());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

async function loadWorkflowDefinitions() {
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const workflowDirs = [
    path.join(repoRoot, 'workflows', 'patterns'),
    path.join(repoRoot, 'workflows', 'elixosense'),
  ];

  for (const dir of workflowDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
        const fullPath = path.join(dir, file);
        const content = await fs.readFile(fullPath, 'utf8');
        const { definition } = loadWorkflowDefinitionFromString(content, 'yaml');
        workflowDefinitions.set(definition.id, definition);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[KCOS API] Failed to load workflows from ${dir}: ${message}`);
    }
  }
}

async function startServer() {
  await loadWorkflowDefinitions();

  const scheduler = new WorkflowScheduler(engine);
  for (const def of workflowDefinitions.values()) {
    scheduler.registerWorkflow(def);
  }

  if (process.env.SCHEDULER_ENABLED !== 'false') {
    scheduler.start();
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`[KCOS API] Server running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('[KCOS API] Failed to start server:', error);
  process.exit(1);
});
