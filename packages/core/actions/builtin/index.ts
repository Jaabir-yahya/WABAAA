/**
 * KCOS Built-in Actions
 * 
 * Core actions that ship with KCOS.
 * These provide the foundational building blocks for workflows.
 */

import { Action } from '../types';
import { ActionRegistry } from '../registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Core actions
import { debugLogAction } from './debug-log';
import { eventLogAction } from './event-log';
import { conditionIfAction } from './condition-if';
import { dataTransformAction } from './data-transform';
import { httpRequestAction } from './http-request';

// Kenya-specific actions
import { whatsappSendAction } from './whatsapp-send';
import { mpesaInitiateAction } from './mpesa-initiate';
import { mpesaVerifyAction } from './mpesa-verify';
import { orderCreateAction } from './order-create';
import { actorResolveAction } from './actor-resolve';
import { qrGenerateAction } from './qr-generate';
import { qrDecodeAction } from './qr-decode';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Core actions
export { debugLogAction } from './debug-log';
export { eventLogAction } from './event-log';
export { conditionIfAction } from './condition-if';
export { dataTransformAction } from './data-transform';
export { httpRequestAction } from './http-request';

// Kenya-specific actions
export { whatsappSendAction } from './whatsapp-send';
export { mpesaInitiateAction } from './mpesa-initiate';
export { mpesaVerifyAction } from './mpesa-verify';
export { orderCreateAction } from './order-create';
export { actorResolveAction } from './actor-resolve';
export { qrGenerateAction } from './qr-generate';
export { qrDecodeAction } from './qr-decode';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL BUILT-IN ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Array of all built-in actions
 */
export const builtinActions: Action[] = [
  // Core
  debugLogAction,
  eventLogAction,
  conditionIfAction,
  dataTransformAction,
  httpRequestAction,
  // Kenya-specific
  whatsappSendAction,
  mpesaInitiateAction,
  mpesaVerifyAction,
  orderCreateAction,
  actorResolveAction,
  qrGenerateAction,
  qrDecodeAction,
];

/**
 * Register all built-in actions to a registry
 */
export function registerBuiltinActions(registry: ActionRegistry): void {
  for (const action of builtinActions) {
    registry.register(action);
  }
  console.log(`[KCOS] Registered ${builtinActions.length} built-in actions`);
}

/**
 * Get a list of built-in action IDs
 */
export function getBuiltinActionIds(): string[] {
  return builtinActions.map(a => a.id);
}
