/**
 * KCOS Workflow Engine
 *
 * Executes workflow definitions step-by-step.
 */

import type { WorkflowDefinition, WorkflowStep } from './types';
import type { WorkflowExecutionContext, WorkflowExecutionResult, WorkflowTriggerInput } from './context';
import { createWorkflowContext } from './context';
import { executeStep } from './step-executor';
import type { ActionRegistry } from '../actions/registry';

export interface WorkflowEngineOptions {
  /** Action registry to resolve actions */
  actionRegistry: ActionRegistry;

  /** Optional expression functions */
  functions?: Record<string, (...args: unknown[]) => unknown>;
}

export class WorkflowEngine {
  private actionRegistry: ActionRegistry;
  private functions?: Record<string, (...args: unknown[]) => unknown>;

  constructor(options: WorkflowEngineOptions) {
    this.actionRegistry = options.actionRegistry;
    this.functions = options.functions;
  }

  /**
   * Execute a workflow definition with trigger data.
   */
  async execute(
    definition: WorkflowDefinition,
    trigger: WorkflowTriggerInput,
    tenantId: string
  ): Promise<WorkflowExecutionResult> {
    const context = createWorkflowContext({
      workflowId: definition.id,
      tenantId,
      trigger,
      actionRegistry: this.actionRegistry,
      functions: this.functions,
    });

    try {
      await this.executeSteps(definition.steps, context);

      return {
        workflowId: definition.id,
        status: 'completed',
        variables: context.variables,
        steps: context.steps,
        startedAt: context.startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        workflowId: definition.id,
        status: 'failed',
        variables: context.variables,
        steps: context.steps,
        error: message,
        startedAt: context.startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Execute steps sequentially.
   */
  private async executeSteps(
    steps: WorkflowStep[],
    context: WorkflowExecutionContext
  ): Promise<void> {
    for (const step of steps) {
      const result = await executeStep(step, context);

      if (result.status === 'failed') {
        throw new Error(result.error || `Step failed: ${step.id}`);
      }

      // Handle branching for condition.if
      if (step.then || step.else) {
        const branch = this.getBranchForStep(step, context);
        if (branch && branch.length > 0) {
          await this.executeSteps(branch, context);
        }
      }
    }
  }

  /**
   * Determine which branch to execute for a conditional step.
   */
  private getBranchForStep(step: WorkflowStep, context: WorkflowExecutionContext): WorkflowStep[] | null {
    if (!step.then && !step.else) {
      return null;
    }

    const stepResult = context.steps[step.id];
    const output = stepResult?.output as Record<string, unknown> | undefined;
    const branch = output?.branch;

    if (branch === 'then') {
      return step.then || [];
    }
    if (branch === 'else') {
      return step.else || [];
    }

    // Default: use "then" if output.result is truthy
    if (output && (output as Record<string, unknown>).result) {
      return step.then || [];
    }
    return step.else || [];
  }
}
