/**
 * KCOS API Server
 *
 * Minimal HTTP server to execute workflows.
 */

import express from 'express';
import { createWorkflowRouter } from './routes/workflows';
import {
  actionRegistry,
  registerBuiltinActions,
} from '@kenya-commerce-os/core/actions';
import { WorkflowEngine } from '@kenya-commerce-os/core/workflows';

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

// Routes
app.use(
  '/api',
  createWorkflowRouter({
    engine,
    registry: actionRegistry,
    definitions: workflowDefinitions,
    executions: workflowExecutions,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// Start server
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[KCOS API] Server running at http://localhost:${port}`);
});
