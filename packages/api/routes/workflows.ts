/**
 * KCOS Workflow Routes
 *
 * REST API endpoints for workflow execution.
 */

import { Router } from 'express';
import {
  WorkflowEngine,
  WorkflowDefinition,
  WorkflowTriggerInput,
  loadWorkflowDefinitionFromObject,
} from '@kenya-commerce-os/core/workflows';
import { ActionRegistry } from '@kenya-commerce-os/core/actions';

export interface WorkflowRouteDependencies {
  engine: WorkflowEngine;
  registry: ActionRegistry;
  definitions: Map<string, WorkflowDefinition>;
  executions: Map<string, unknown>;
}

export function createWorkflowRouter(deps: WorkflowRouteDependencies): Router {
  const router = Router();

  /**
   * List available workflow definitions
   */
  router.get('/workflows', (_req, res) => {
    const list = Array.from(deps.definitions.values()).map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      version: def.version,
      trigger: def.trigger,
    }));

    res.json({ workflows: list });
  });

  /**
   * Execute a workflow
   */
  router.post('/workflows/execute', async (req, res) => {
    try {
      const {
        workflowId,
        definition,
        trigger,
        tenantId = 'default-tenant',
      } = req.body || {};

      let workflowDef: WorkflowDefinition | undefined;

      if (definition) {
        workflowDef = loadWorkflowDefinitionFromObject(definition);
        deps.definitions.set(workflowDef.id, workflowDef);
      } else if (workflowId) {
        workflowDef = deps.definitions.get(workflowId);
      }

      if (!workflowDef) {
        return res.status(404).json({
          error: 'Workflow definition not found',
        });
      }

      if (!trigger || typeof trigger !== 'object') {
        return res.status(400).json({
          error: 'Trigger object is required',
        });
      }

      const triggerInput: WorkflowTriggerInput = {
        type: trigger.type || 'manual.trigger',
        data: trigger.data || {},
        metadata: trigger.metadata || {},
      };

      const result = await deps.engine.execute(workflowDef, triggerInput, tenantId);
      deps.executions.set(workflowDef.id, result);

      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  /**
   * Get last execution status of a workflow
   */
  router.get('/workflows/:id/status', (req, res) => {
    const workflowId = req.params.id;
    const execution = deps.executions.get(workflowId);

    if (!execution) {
      return res.status(404).json({ error: 'No execution found for workflow' });
    }

    return res.json(execution);
  });

  return router;
}
