/**
 * KCOS Workflows
 *
 * Exports workflow types and loader utilities.
 */

export type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  TriggerType,
  FilterCondition,
  ErrorHandling,
  WorkflowLoadResult,
} from './types';

export {
  loadWorkflowDefinitionFromString,
  loadWorkflowDefinitionFromObject,
  validateWorkflowDefinition,
} from './loader';

export type {
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  WorkflowTriggerInput,
} from './context';

export {
  createWorkflowContext,
} from './context';

export {
  WorkflowEngine,
} from './engine';

export type {
  StepExecutionResult,
} from './step-executor';

export {
  executeStep,
} from './step-executor';
