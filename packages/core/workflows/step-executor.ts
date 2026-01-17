/**
 * KCOS Step Executor
 *
 * Executes a single workflow step.
 */

import type { WorkflowStep } from './types';
import type { WorkflowExecutionContext } from './context';
import { resolveInput, evaluateExpression } from '../expressions/evaluator';
import { createExpressionContext } from '../expressions/evaluator';
import { ActionContext } from '../actions/types';

export interface StepExecutionResult {
  stepId: string;
  status: 'completed' | 'skipped' | 'failed';
  output?: unknown;
  error?: string;
}

/**
 * Execute a workflow step.
 */
export async function executeStep(
  step: WorkflowStep,
  context: WorkflowExecutionContext
): Promise<StepExecutionResult> {
  // Handle conditional execution (when)
  if (step.when) {
    const whenResult = evaluateExpression(step.when, createExpressionContext(context.variables, context.functions));
    if (!whenResult.success) {
      return {
        stepId: step.id,
        status: 'failed',
        error: `Failed to evaluate 'when' condition: ${whenResult.error}`,
      };
    }
    if (!whenResult.value) {
      context.steps[step.id] = { status: 'skipped' };
      return { stepId: step.id, status: 'skipped' };
    }
  }

  // Get action
  const action = context.actionRegistry.getOrThrow(step.action);

  // Resolve input using expression evaluator
  const resolvedInput = resolveInput(step.input || {}, context.variables, {
    functions: context.functions,
  });

  // Build action context
  const actionContext: ActionContext = {
    tenantId: context.tenantId,
    workflowId: context.workflowId,
    stepId: step.id,
    correlationId: context.correlationId,
    variables: context.variables,
    idempotencyKey: `${context.workflowId}:${step.id}`,
    workflowStartedAt: context.startedAt,
    attemptNumber: 1,
  };

  // Execute action
  const result = await action.execute(resolvedInput, actionContext);

  if (!result.success) {
    context.steps[step.id] = { status: 'failed' };
    return {
      stepId: step.id,
      status: 'failed',
      error: result.error || 'Action failed',
    };
  }

  const output = result.data || {};

  // Store output in variables
  if (!context.variables.steps || typeof context.variables.steps !== 'object') {
    context.variables.steps = {};
  }

  const stepsVar = context.variables.steps as Record<string, unknown>;
  stepsVar[step.id] = { output };

  if (step.output) {
    context.variables[step.output] = output;
  }

  context.steps[step.id] = { status: 'completed', output };

  return {
    stepId: step.id,
    status: 'completed',
    output,
  };
}
