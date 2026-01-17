/**
 * KCOS Action Helpers
 * 
 * Utility functions for creating and working with actions.
 */

import {
  Action,
  ActionCategory,
  ActionContext,
  ActionInput,
  ActionOutput,
  JSONSchema,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActionDefinition {
  id: string;
  category: ActionCategory;
  description: string;
  version?: string;
  
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  
  retryable?: boolean;
  idempotent?: boolean;
  defaultRetryPolicy?: RetryPolicy;
  timeoutMs?: number;
  
  execute: (input: ActionInput, context: ActionContext) => Promise<ActionOutput>;
  compensate?: (input: ActionInput, context: ActionContext) => Promise<void>;
  validate?: (input: ActionInput) => { valid: boolean; errors?: string[] };
}

/**
 * Create an action from a definition object
 * Provides sensible defaults for optional properties
 */
export function defineAction(def: ActionDefinition): Action {
  return {
    id: def.id,
    category: def.category,
    description: def.description,
    version: def.version || '1.0.0',
    
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    
    retryable: def.retryable ?? true,
    idempotent: def.idempotent ?? false,
    defaultRetryPolicy: def.defaultRetryPolicy || (def.retryable !== false ? DEFAULT_RETRY_POLICY : undefined),
    timeoutMs: def.timeoutMs || 30000,
    
    execute: def.execute,
    compensate: def.compensate,
    validate: def.validate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a successful action output
 */
export function success(data?: Record<string, unknown>, metadata?: ActionOutput['metadata']): ActionOutput {
  return {
    success: true,
    data,
    metadata,
  };
}

/**
 * Create a failed action output
 */
export function failure(
  error: string, 
  options?: { 
    errorCode?: string; 
    shouldRetry?: boolean;
    data?: Record<string, unknown>;
  }
): ActionOutput {
  return {
    success: false,
    error,
    errorCode: options?.errorCode,
    shouldRetry: options?.shouldRetry,
    data: options?.data,
  };
}

/**
 * Create a "not found" failure
 */
export function notFound(resource: string, identifier: string): ActionOutput {
  return failure(
    `${resource} not found: ${identifier}`,
    { errorCode: 'NOT_FOUND', shouldRetry: false }
  );
}

/**
 * Create a "validation error" failure
 */
export function validationError(errors: string[]): ActionOutput {
  return failure(
    `Validation failed: ${errors.join(', ')}`,
    { errorCode: 'VALIDATION_ERROR', shouldRetry: false }
  );
}

/**
 * Create a "timeout" failure
 */
export function timeout(operation: string, durationMs: number): ActionOutput {
  return failure(
    `${operation} timed out after ${durationMs}ms`,
    { errorCode: 'TIMEOUT', shouldRetry: true }
  );
}

/**
 * Create a "rate limited" failure
 */
export function rateLimited(retryAfterMs?: number): ActionOutput {
  return failure(
    retryAfterMs 
      ? `Rate limited. Retry after ${retryAfterMs}ms` 
      : 'Rate limited',
    { errorCode: 'RATE_LIMITED', shouldRetry: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common schema for no input (empty object)
 */
export const NO_INPUT_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {},
  description: 'No input required',
};

/**
 * Common schema for simple success output
 */
export const SUCCESS_OUTPUT_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'Whether the action succeeded' },
  },
};

/**
 * Create an object schema with required properties
 */
export function objectSchema(
  properties: Record<string, JSONSchema['properties'][string]>,
  required?: string[],
  description?: string
): JSONSchema {
  return {
    type: 'object',
    properties,
    required,
    description,
  };
}

/**
 * String property schema
 */
export function stringProp(description: string, options?: { 
  pattern?: string; 
  minLength?: number; 
  maxLength?: number;
  enum?: string[];
  format?: string;
  default?: string;
}): JSONSchema['properties'][string] {
  return {
    type: 'string',
    description,
    ...options,
  };
}

/**
 * Number property schema
 */
export function numberProp(description: string, options?: {
  minimum?: number;
  maximum?: number;
  default?: number;
}): JSONSchema['properties'][string] {
  return {
    type: 'number',
    description,
    ...options,
  };
}

/**
 * Boolean property schema
 */
export function booleanProp(description: string, defaultValue?: boolean): JSONSchema['properties'][string] {
  return {
    type: 'boolean',
    description,
    default: defaultValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap an action execution with timing
 */
export async function withTiming<T extends ActionOutput>(
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;
  
  return {
    ...result,
    metadata: {
      ...result.metadata,
      durationMs,
    },
  };
}

/**
 * Wrap an action execution with error handling
 */
export async function withErrorHandling(
  fn: () => Promise<ActionOutput>,
  options?: {
    retryOnError?: boolean;
    errorPrefix?: string;
  }
): Promise<ActionOutput> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = options?.errorPrefix ? `${options.errorPrefix}: ` : '';
    
    return failure(
      `${prefix}${message}`,
      { 
        errorCode: 'EXECUTION_ERROR', 
        shouldRetry: options?.retryOnError ?? true,
      }
    );
  }
}

/**
 * Create a wrapped execute function with timing and error handling
 */
export function createExecutor(
  fn: (input: ActionInput, context: ActionContext) => Promise<ActionOutput>,
  options?: {
    retryOnError?: boolean;
    errorPrefix?: string;
  }
): (input: ActionInput, context: ActionContext) => Promise<ActionOutput> {
  return async (input: ActionInput, context: ActionContext) => {
    return withTiming(() => 
      withErrorHandling(
        () => fn(input, context),
        options
      )
    );
  };
}
