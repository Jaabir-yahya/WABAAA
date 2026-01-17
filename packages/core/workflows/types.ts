/**
 * KCOS Workflow Types
 *
 * Defines the workflow DSL for KCOS.
 */

import type { RetryPolicy } from '../actions/types';

// ═════════════════════════════════════════════════════════════════════════════==
// TRIGGERS
// ═════════════════════════════════════════════════════════════════════════════==

export type TriggerType =
  | 'whatsapp.received'
  | 'mpesa.callback'
  | 'qr.scanned'
  | 'webhook.received'
  | 'schedule.cron'
  | 'manual.trigger'
  | 'http.request'
  | 'event.emitted';

export interface WorkflowTrigger {
  /** Trigger type */
  type: TriggerType;

  /** Optional conditions to filter trigger events */
  conditions?: FilterCondition[];

  /** Optional schedule (cron) */
  schedule?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface FilterCondition {
  /** Field path or expression (e.g., "{{ data.text }}") */
  field: string;

  /** Operator */
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in';

  /** Value to compare against */
  value: unknown;
}

// ═════════════════════════════════════════════════════════════════════════════==
// WORKFLOW STEPS
// ═════════════════════════════════════════════════════════════════════════════==

export interface WorkflowStep {
  /** Unique step identifier */
  id: string;

  /** Action to execute (action registry ID) */
  action: string;

  /** Input mapping (resolved by expression evaluator) */
  input: Record<string, unknown>;

  /** Store output in variable */
  output?: string;

  /** Conditional execution (expression) */
  when?: string;

  /** Branches for condition.if */
  then?: WorkflowStep[];
  else?: WorkflowStep[];

  /** Compensation action if later step fails */
  compensation?: string;

  /** Step-level retry policy */
  retryPolicy?: RetryPolicy;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Step-level error handling */
  onError?: 'compensate' | 'continue' | 'abort' | 'retry';
}

// ═════════════════════════════════════════════════════════════════════════════==
// ERROR HANDLING
// ═════════════════════════════════════════════════════════════════════════════==

export interface ErrorHandling {
  strategy: 'compensate' | 'retry' | 'ignore' | 'notify' | 'abort';
  maxRetries?: number;
  notifyChannel?: string;
  errorWorkflow?: string;
}

// ═════════════════════════════════════════════════════════════════════════════==
// WORKFLOW DEFINITION
// ═════════════════════════════════════════════════════════════════════════════==

export interface WorkflowDefinition {
  /** Unique workflow ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Version for tracking changes */
  version?: string;

  /** Tags for organization */
  tags?: string[];

  /** Trigger definition */
  trigger: WorkflowTrigger;

  /** Steps to execute */
  steps: WorkflowStep[];

  /** Global error handling */
  onError?: ErrorHandling;

  /** Active flag */
  isActive?: boolean;

  /** Tenant-specific config */
  tenantConfig?: Record<string, unknown>;
}

// ═════════════════════════════════════════════════════════════════════════════==
// LOAD RESULT
// ═════════════════════════════════════════════════════════════════════════════==

export interface WorkflowLoadResult {
  definition: WorkflowDefinition;
  source: 'json' | 'yaml';
}
