/**
 * KCOS Action System
 * 
 * The atomic building blocks of the Kenya Commerce OS platform.
 * 
 * @example
 * ```typescript
 * import { 
 *   actionRegistry, 
 *   defineAction, 
 *   success, 
 *   failure 
 * } from '@kenya-commerce-os/core/actions';
 * 
 * // Define an action
 * const myAction = defineAction({
 *   id: 'my.action',
 *   category: 'data',
 *   description: 'Does something useful',
 *   inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
 *   outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
 *   execute: async (input, context) => {
 *     return success({ result: `Hello, ${input.name}` });
 *   }
 * });
 * 
 * // Register it
 * actionRegistry.register(myAction);
 * 
 * // Use it
 * const action = actionRegistry.get('my.action');
 * const result = await action.execute({ name: 'World' }, context);
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  Action,
  ActionCategory,
  ActionContext,
  ActionInput,
  ActionOutput,
  ActionMetadata,
  JSONSchema,
  JSONSchemaProperty,
  RetryPolicy,
} from './types';

export {
  DEFAULT_RETRY_POLICY,
  getActionMetadata,
  createTestContext,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ActionRegistry,
  actionRegistry,
  createRegistry,
  registerAction,
  getAction,
} from './registry';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ActionDefinition,
} from './helpers';

export {
  // Action builder
  defineAction,
  
  // Output helpers
  success,
  failure,
  notFound,
  validationError,
  timeout,
  rateLimited,
  
  // Schema helpers
  NO_INPUT_SCHEMA,
  SUCCESS_OUTPUT_SCHEMA,
  objectSchema,
  stringProp,
  numberProp,
  booleanProp,
  
  // Execution helpers
  withTiming,
  withErrorHandling,
  createExecutor,
} from './helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Individual actions
  debugLogAction,
  eventLogAction,
  conditionIfAction,
  dataTransformAction,
  httpRequestAction,
  whatsappSendAction,
  mpesaInitiateAction,
  mpesaVerifyAction,
  orderCreateAction,
  actorResolveAction,
  qrGenerateAction,
  qrDecodeAction,
  
  // Collections and utilities
  builtinActions,
  registerBuiltinActions,
  getBuiltinActionIds,
} from './builtin';
