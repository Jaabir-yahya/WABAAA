/**
 * KCOS Workflow Context
 *
 * In-memory execution context for workflows.
 */

import type { ActionRegistry } from '../actions/registry';

export interface WorkflowExecutionContext {
  /** Workflow ID */
  workflowId: string;

  /** Tenant ID */
  tenantId: string;

  /** Trigger data */
  trigger: Record<string, unknown>;

  /** Variables accumulated during execution */
  variables: Record<string, unknown>;

  /** Steps metadata */
  steps: Record<string, { status: 'skipped' | 'completed' | 'failed'; output?: unknown }>;

  /** Execution timestamps */
  startedAt: Date;

  /** Action registry */
  actionRegistry: ActionRegistry;

  /** Optional functions for expression evaluation */
  functions?: Record<string, (...args: unknown[]) => unknown>;

  /** Correlation ID for tracing */
  correlationId: string;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: 'completed' | 'failed';
  variables: Record<string, unknown>;
  steps: WorkflowExecutionContext['steps'];
  error?: string;
  startedAt: Date;
  completedAt: Date;
}

export interface WorkflowTriggerInput {
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Create a workflow execution context.
 */
export function createWorkflowContext(params: {
  workflowId: string;
  tenantId: string;
  trigger: WorkflowTriggerInput;
  actionRegistry: ActionRegistry;
  functions?: Record<string, (...args: unknown[]) => unknown>;
  correlationId?: string;
}): WorkflowExecutionContext {
  const startedAt = new Date();
  const correlationId =
    params.correlationId || `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    workflowId: params.workflowId,
    tenantId: params.tenantId,
    trigger: params.trigger as Record<string, unknown>,
    variables: {
      trigger: params.trigger.data,
      metadata: params.trigger.metadata || {},
      workflow: {
        id: params.workflowId,
        startedAt: startedAt.toISOString(),
      },
    },
    steps: {},
    startedAt,
    actionRegistry: params.actionRegistry,
    functions: params.functions,
    correlationId,
  };
}
