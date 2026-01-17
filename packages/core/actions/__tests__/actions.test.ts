/**
 * KCOS Actions Test Suite
 * 
 * Tests for the action system: types, registry, and built-in actions.
 */

import {
  // Registry
  ActionRegistry,
  actionRegistry,
  createRegistry,
  
  // Types
  Action,
  ActionContext,
  createTestContext,
  
  // Helpers
  defineAction,
  success,
  failure,
  objectSchema,
  stringProp,
  
  // Built-in actions
  debugLogAction,
  eventLogAction,
  conditionIfAction,
  dataTransformAction,
  httpRequestAction,
  builtinActions,
  registerBuiltinActions,
} from '../index';

describe('ActionRegistry', () => {
  let registry: ActionRegistry;
  
  beforeEach(() => {
    registry = createRegistry();
  });
  
  test('should register an action', () => {
    registry.register(debugLogAction);
    expect(registry.has('debug.log')).toBe(true);
    expect(registry.count()).toBe(1);
  });
  
  test('should reject duplicate registration', () => {
    registry.register(debugLogAction);
    expect(() => registry.register(debugLogAction)).toThrow();
  });
  
  test('should reject invalid action IDs', () => {
    const invalidAction = { ...debugLogAction, id: 'invalid' };
    expect(() => registry.register(invalidAction)).toThrow();
  });
  
  test('should get action by ID', () => {
    registry.register(debugLogAction);
    const action = registry.get('debug.log');
    expect(action).toBeDefined();
    expect(action?.id).toBe('debug.log');
  });
  
  test('should return undefined for unknown action', () => {
    const action = registry.get('unknown.action');
    expect(action).toBeUndefined();
  });
  
  test('should throw for unknown action with getOrThrow', () => {
    expect(() => registry.getOrThrow('unknown.action')).toThrow();
  });
  
  test('should list all actions', () => {
    registerBuiltinActions(registry);
    const actions = registry.listAll();
    expect(actions.length).toBe(builtinActions.length);
  });
  
  test('should list actions by category', () => {
    registerBuiltinActions(registry);
    const debugActions = registry.listByCategory('debug');
    expect(debugActions.length).toBeGreaterThan(0);
    expect(debugActions[0].category).toBe('debug');
  });
  
  test('should search actions', () => {
    registerBuiltinActions(registry);
    const results = registry.search('log');
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should unregister action', () => {
    registry.register(debugLogAction);
    expect(registry.has('debug.log')).toBe(true);
    
    const result = registry.unregister('debug.log');
    expect(result).toBe(true);
    expect(registry.has('debug.log')).toBe(false);
  });
});

describe('defineAction helper', () => {
  test('should create action with defaults', () => {
    const action = defineAction({
      id: 'test.action',
      category: 'debug',
      description: 'Test action',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      execute: async () => success({}),
    });
    
    expect(action.id).toBe('test.action');
    expect(action.retryable).toBe(true);
    expect(action.idempotent).toBe(false);
    expect(action.version).toBe('1.0.0');
  });
});

describe('Built-in Actions', () => {
  let context: ActionContext;
  
  beforeEach(() => {
    context = createTestContext();
  });
  
  describe('debug.log', () => {
    test('should log message and return success', async () => {
      const result = await debugLogAction.execute(
        { message: 'Test message' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.logged).toBe(true);
      expect(result.data?.timestamp).toBeDefined();
    });
    
    test('should handle different log levels', async () => {
      const levels = ['debug', 'info', 'warn', 'error'];
      
      for (const level of levels) {
        const result = await debugLogAction.execute(
          { message: `Test ${level}`, level },
          context
        );
        expect(result.success).toBe(true);
      }
    });
  });
  
  describe('event.log', () => {
    test('should log event and return ID', async () => {
      const result = await eventLogAction.execute(
        { 
          eventType: 'test.event',
          eventData: { foo: 'bar' },
        },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.eventId).toBeDefined();
      expect(result.data?.globalSequence).toBeDefined();
    });
  });
  
  describe('condition.if', () => {
    test('should evaluate true condition', async () => {
      const result = await conditionIfAction.execute(
        { condition: 'true' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(true);
      expect(result.data?.branch).toBe('then');
    });
    
    test('should evaluate false condition', async () => {
      const result = await conditionIfAction.execute(
        { condition: 'false' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(false);
      expect(result.data?.branch).toBe('else');
    });
    
    test('should evaluate variable reference', async () => {
      const contextWithVars = createTestContext({
        variables: { isVip: true },
      });
      
      const result = await conditionIfAction.execute(
        { condition: '{{ isVip }}' },
        contextWithVars
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(true);
    });
  });
  
  describe('data.transform', () => {
    test('should transform data using mapping', async () => {
      const contextWithVars = createTestContext({
        variables: {
          order: {
            id: '123',
            customer: { name: 'John' },
            total: 500,
          },
        },
      });
      
      const result = await dataTransformAction.execute(
        {
          mapping: {
            orderId: '{{ order.id }}',
            customerName: '{{ order.customer.name }}',
            amount: '{{ order.total }}',
            status: 'pending', // literal value
          },
        },
        contextWithVars
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.transformed).toEqual({
        orderId: '123',
        customerName: 'John',
        amount: 500,
        status: 'pending',
      });
    });
    
    test('should apply defaults for missing values', async () => {
      const result = await dataTransformAction.execute(
        {
          source: { existing: 'value' },
          mapping: {
            existing: '{{ existing }}',
            missing: '{{ nonexistent }}',
          },
          defaults: {
            missing: 'default_value',
          },
        },
        context
      );
      
      expect(result.success).toBe(true);
      const transformed = result.data?.transformed as Record<string, unknown> | undefined;
      expect(transformed?.existing).toBe('value');
      expect(transformed?.missing).toBe('default_value');
    });
  });
  
  describe('http.request', () => {
    test('should validate URL', async () => {
      const result = await httpRequestAction.execute(
        { url: 'not-a-valid-url' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_URL');
    });
    
    // Note: Actual HTTP tests would require mocking or a test server
    test('should have correct metadata', () => {
      expect(httpRequestAction.id).toBe('http.request');
      expect(httpRequestAction.category).toBe('integration');
      expect(httpRequestAction.retryable).toBe(true);
    });
  });
});

describe('Built-in Actions Collection', () => {
  test('should have correct number of actions', () => {
    expect(builtinActions.length).toBe(12); // 5 core + 7 Kenya-specific
  });
  
  test('all actions should have valid IDs', () => {
    const idPattern = /^[a-z][a-z0-9]*\.[a-z][a-z0-9_]*$/;
    
    for (const action of builtinActions) {
      expect(action.id).toMatch(idPattern);
    }
  });
  
  test('all actions should have descriptions', () => {
    for (const action of builtinActions) {
      expect(action.description).toBeTruthy();
      expect(action.description.length).toBeGreaterThan(10);
    }
  });
  
  test('all actions should have schemas', () => {
    for (const action of builtinActions) {
      expect(action.inputSchema).toBeDefined();
      expect(action.outputSchema).toBeDefined();
    }
  });
});
