/**
 * KCOS Action System - Core Types
 * 
 * Actions are the atomic building blocks of the KCOS platform.
 * Every action has the same interface, making them composable.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export type ActionCategory =
  | 'communication'  // whatsapp, sms, notification
  | 'payment'        // mpesa, payment
  | 'identity'       // actor
  | 'data'           // order, event
  | 'document'       // document, receipt, image
  | 'integration'    // webhook, erp, api
  | 'qr'             // qr
  | 'control'        // condition, parallel, wait, loop
  | 'debug';         // debug, test

// ═══════════════════════════════════════════════════════════════════════════════
// JSON SCHEMA (Simplified)
// ═══════════════════════════════════════════════════════════════════════════════

export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  required?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  description?: string;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface RetryPolicy {
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Backoff strategy */
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  
  /** Initial delay between retries (ms) */
  initialIntervalMs: number;
  
  /** Maximum delay between retries (ms) */
  maxIntervalMs: number;
  
  /** Multiplier for exponential backoff */
  backoffCoefficient?: number;
  
  /** Error codes that should NOT be retried */
  nonRetryableErrors?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActionContext {
  /** Tenant/business ID */
  tenantId: string;
  
  /** Workflow instance ID */
  workflowId: string;
  
  /** Current step ID within the workflow */
  stepId: string;
  
  /** Correlation ID for tracing related events */
  correlationId: string;
  
  /** All variables accumulated from previous steps */
  variables: Record<string, unknown>;
  
  /** Unique key for idempotency (prevents duplicate execution) */
  idempotencyKey: string;
  
  /** Timestamp when workflow started */
  workflowStartedAt: Date;
  
  /** Current attempt number (1-based) */
  attemptNumber: number;
  
  /** Optional: Actor who triggered this workflow */
  actorId?: string;
  
  /** Optional: Source channel (whatsapp, web, api, qr) */
  sourceChannel?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION INPUT/OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/** Generic input type - shape defined by action's inputSchema */
export type ActionInput = Record<string, unknown>;

/** Output returned from action.execute() */
export interface ActionOutput {
  /** Did the action succeed? */
  success: boolean;
  
  /** Output data (shape defined by outputSchema) */
  data?: Record<string, unknown>;
  
  /** Error message if success=false */
  error?: string;
  
  /** Error code for programmatic handling */
  errorCode?: string;
  
  /** Should this be retried? (overrides action.retryable) */
  shouldRetry?: boolean;
  
  /** Optional metadata about the execution */
  metadata?: {
    /** Duration in milliseconds */
    durationMs?: number;
    /** Was this a cached/idempotent result? */
    fromCache?: boolean;
    /** External reference ID (e.g., WhatsApp message ID) */
    externalId?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface Action {
  // ─────────────────────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Unique identifier, format: category.name (e.g., 'whatsapp.send') */
  id: string;
  
  /** Category for grouping in UI */
  category: ActionCategory;
  
  /** Human-readable description */
  description: string;
  
  /** Version for tracking changes */
  version?: string;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** JSON Schema defining required/optional inputs */
  inputSchema: JSONSchema;
  
  /** JSON Schema defining output structure */
  outputSchema: JSONSchema;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // BEHAVIOR
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Can this action be retried on failure? */
  retryable: boolean;
  
  /** Is this action safe to execute multiple times with same input? */
  idempotent: boolean;
  
  /** Default retry policy (can be overridden in workflow step) */
  defaultRetryPolicy?: RetryPolicy;
  
  /** Timeout for this action in milliseconds */
  timeoutMs?: number;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Execute the action */
  execute(input: ActionInput, context: ActionContext): Promise<ActionOutput>;
  
  /** Optional: Undo the action if a later step fails (saga compensation) */
  compensate?(input: ActionInput, context: ActionContext): Promise<void>;
  
  /** Optional: Validate input before execution */
  validate?(input: ActionInput): { valid: boolean; errors?: string[] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION METADATA (for UI/listing)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActionMetadata {
  id: string;
  category: ActionCategory;
  description: string;
  version?: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  retryable: boolean;
  idempotent: boolean;
  hasCompensation: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Extract action metadata from an action */
export function getActionMetadata(action: Action): ActionMetadata {
  return {
    id: action.id,
    category: action.category,
    description: action.description,
    version: action.version,
    inputSchema: action.inputSchema,
    outputSchema: action.outputSchema,
    retryable: action.retryable,
    idempotent: action.idempotent,
    hasCompensation: !!action.compensate,
  };
}

/** Default retry policy for retryable actions */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffStrategy: 'exponential',
  initialIntervalMs: 1000,
  maxIntervalMs: 30000,
  backoffCoefficient: 2,
};

/** Create a minimal action context for testing */
export function createTestContext(overrides?: Partial<ActionContext>): ActionContext {
  const now = new Date();
  const workflowId = `test-workflow-${Date.now()}`;
  
  return {
    tenantId: 'test-tenant',
    workflowId,
    stepId: 'test-step',
    correlationId: `corr-${Date.now()}`,
    variables: {},
    idempotencyKey: `${workflowId}-test-step`,
    workflowStartedAt: now,
    attemptNumber: 1,
    ...overrides,
  };
}
