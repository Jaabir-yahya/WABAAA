/**
 * condition.if Action
 * 
 * Evaluate a condition and return which branch to take.
 * This is a control-flow action used for branching in workflows.
 * 
 * Note: The actual branching is handled by the workflow engine.
 * This action just evaluates the condition and returns the result.
 */

import { defineAction, success, failure, objectSchema, stringProp, booleanProp } from '../helpers';

export const conditionIfAction = defineAction({
  id: 'condition.if',
  category: 'control',
  description: 'Evaluate a condition expression and determine which branch to take',
  version: '1.0.0',
  
  inputSchema: objectSchema(
    {
      condition: stringProp(
        'JSONata expression that evaluates to true/false (e.g., "{{ order.total > 1000 }}")'
      ),
      // The workflow engine will use 'then' and 'else' branches
      // This action just evaluates and returns the result
    },
    ['condition'],
    'Input for condition.if action'
  ),
  
  outputSchema: objectSchema({
    result: { type: 'boolean', description: 'The evaluated condition result' },
    branch: { type: 'string', description: '"then" or "else" based on result' },
    evaluatedExpression: { type: 'string', description: 'The expression that was evaluated' },
  }),
  
  retryable: false, // Conditions should be deterministic
  idempotent: true,
  
  async execute(input, context) {
    const conditionExpr = input.condition as string;
    
    // For now, we'll do simple evaluation
    // In real implementation, use JSONata or a safe expression evaluator
    let result: boolean;
    let evaluatedValue: unknown;
    
    try {
      // Check for simple boolean values
      if (conditionExpr === 'true') {
        result = true;
        evaluatedValue = true;
      } else if (conditionExpr === 'false') {
        result = false;
        evaluatedValue = false;
      } else {
        // TODO: Integrate with expression evaluator
        // For now, try to evaluate as a simple comparison if it's in context.variables
        
        // Check if it's a variable reference like {{ varName }}
        const varMatch = conditionExpr.match(/^\{\{\s*([^}]+)\s*\}\}$/);
        if (varMatch) {
          const varPath = varMatch[1].trim();
          evaluatedValue = getNestedValue(context.variables, varPath);
          result = Boolean(evaluatedValue);
        } else {
          // Try direct evaluation (UNSAFE - replace with JSONata in production)
          // This is a placeholder - real implementation will use JSONata
          console.warn('[condition.if] Expression evaluation is limited. Use JSONata in production.');
          result = false;
          evaluatedValue = conditionExpr;
        }
      }
    } catch (error) {
      return failure(
        `Failed to evaluate condition: ${error instanceof Error ? error.message : String(error)}`,
        { errorCode: 'EVALUATION_ERROR', shouldRetry: false }
      );
    }
    
    return success({
      result,
      branch: result ? 'then' : 'else',
      evaluatedExpression: conditionExpr,
    });
  },
});

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue({ order: { total: 100 } }, 'order.total') => 100
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}
