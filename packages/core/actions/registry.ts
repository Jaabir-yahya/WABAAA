/**
 * KCOS Action Registry
 * 
 * Central catalog of all available actions.
 * Actions must be registered before they can be used in workflows.
 */

import { 
  Action, 
  ActionCategory, 
  ActionMetadata, 
  getActionMetadata 
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION REGISTRY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ActionRegistry {
  private actions: Map<string, Action> = new Map();
  private categoryIndex: Map<ActionCategory, Set<string>> = new Map();
  
  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Register a new action
   * @throws Error if action with same ID already exists
   */
  register(action: Action): void {
    // Validate action ID format
    if (!this.isValidActionId(action.id)) {
      throw new Error(
        `Invalid action ID: "${action.id}". ` +
        `Action IDs must be in format "category.name" (e.g., "whatsapp.send")`
      );
    }
    
    // Check for duplicates
    if (this.actions.has(action.id)) {
      throw new Error(
        `Action "${action.id}" is already registered. ` +
        `Use replace() to update an existing action.`
      );
    }
    
    // Store action
    this.actions.set(action.id, action);
    
    // Update category index
    if (!this.categoryIndex.has(action.category)) {
      this.categoryIndex.set(action.category, new Set());
    }
    this.categoryIndex.get(action.category)!.add(action.id);
    
    console.log(`[ActionRegistry] Registered action: ${action.id}`);
  }
  
  /**
   * Register multiple actions at once
   */
  registerAll(actions: Action[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }
  
  /**
   * Replace an existing action (useful for hot-reloading)
   */
  replace(action: Action): void {
    if (!this.actions.has(action.id)) {
      throw new Error(
        `Action "${action.id}" is not registered. ` +
        `Use register() to add a new action.`
      );
    }
    
    // Get old action to update category index if needed
    const oldAction = this.actions.get(action.id)!;
    
    // Update category index if category changed
    if (oldAction.category !== action.category) {
      this.categoryIndex.get(oldAction.category)?.delete(action.id);
      
      if (!this.categoryIndex.has(action.category)) {
        this.categoryIndex.set(action.category, new Set());
      }
      this.categoryIndex.get(action.category)!.add(action.id);
    }
    
    // Replace action
    this.actions.set(action.id, action);
    
    console.log(`[ActionRegistry] Replaced action: ${action.id}`);
  }
  
  /**
   * Unregister an action
   */
  unregister(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }
    
    // Remove from category index
    this.categoryIndex.get(action.category)?.delete(actionId);
    
    // Remove action
    this.actions.delete(actionId);
    
    console.log(`[ActionRegistry] Unregistered action: ${actionId}`);
    return true;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RETRIEVAL
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Get an action by ID
   */
  get(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }
  
  /**
   * Get an action by ID, throw if not found
   */
  getOrThrow(actionId: string): Action {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(
        `Action "${actionId}" not found in registry. ` +
        `Available actions: ${this.listIds().join(', ')}`
      );
    }
    return action;
  }
  
  /**
   * Check if an action exists
   */
  has(actionId: string): boolean {
    return this.actions.has(actionId);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LISTING
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * List all action IDs
   */
  listIds(): string[] {
    return Array.from(this.actions.keys()).sort();
  }
  
  /**
   * List all actions (full objects)
   */
  listAll(): Action[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * List action metadata (for UI display)
   */
  listMetadata(): ActionMetadata[] {
    return this.listAll().map(getActionMetadata);
  }
  
  /**
   * List actions by category
   */
  listByCategory(category: ActionCategory): Action[] {
    const actionIds = this.categoryIndex.get(category) || new Set();
    return Array.from(actionIds)
      .map(id => this.actions.get(id)!)
      .filter(Boolean);
  }
  
  /**
   * List all categories with action counts
   */
  listCategories(): { category: ActionCategory; count: number }[] {
    return Array.from(this.categoryIndex.entries())
      .map(([category, ids]) => ({ category, count: ids.size }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }
  
  /**
   * Get total count of registered actions
   */
  count(): number {
    return this.actions.size;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Search actions by query string (matches ID and description)
   */
  search(query: string): Action[] {
    const lowerQuery = query.toLowerCase();
    
    return this.listAll().filter(action => 
      action.id.toLowerCase().includes(lowerQuery) ||
      action.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Find actions that can be compensated
   */
  listCompensatable(): Action[] {
    return this.listAll().filter(action => !!action.compensate);
  }
  
  /**
   * Find idempotent actions
   */
  listIdempotent(): Action[] {
    return this.listAll().filter(action => action.idempotent);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Validate action ID format (category.name)
   */
  private isValidActionId(id: string): boolean {
    const pattern = /^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/;
    return pattern.test(id);
  }
  
  /**
   * Validate that all actions referenced in a list exist
   */
  validateActionIds(actionIds: string[]): { valid: boolean; missing: string[] } {
    const missing = actionIds.filter(id => !this.has(id));
    return {
      valid: missing.length === 0,
      missing,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Clear all registered actions (useful for testing)
   */
  clear(): void {
    this.actions.clear();
    this.categoryIndex.clear();
    console.log('[ActionRegistry] Cleared all actions');
  }
  
  /**
   * Export registry state for debugging
   */
  toJSON(): object {
    return {
      actionCount: this.count(),
      categories: this.listCategories(),
      actions: this.listMetadata(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Global action registry instance
 * 
 * Usage:
 *   import { actionRegistry } from '@kenya-commerce-os/core/actions';
 *   actionRegistry.register(myAction);
 *   const action = actionRegistry.get('whatsapp.send');
 */
export const actionRegistry = new ActionRegistry();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new isolated registry (for testing)
 */
export function createRegistry(): ActionRegistry {
  return new ActionRegistry();
}

/**
 * Register an action to the global registry
 */
export function registerAction(action: Action): void {
  actionRegistry.register(action);
}

/**
 * Get an action from the global registry
 */
export function getAction(actionId: string): Action | undefined {
  return actionRegistry.get(actionId);
}
