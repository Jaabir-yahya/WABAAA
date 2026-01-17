/**
 * KCOS Expression Evaluator
 *
 * Uses JSONata to evaluate expressions and resolve templates.
 * This is the engine for {{ ... }} syntax in workflow definitions.
 */

import jsonata from 'jsonata';
import { ExpressionContext, ExpressionResult, TemplateResolveOptions } from './types';

// Regex to find {{ ... }} expressions in strings
const TEMPLATE_REGEX = /\{\{(.*?)\}\}/g;

/**
 * Evaluate a single JSONata expression.
 */
export function evaluateExpression(
  expression: string,
  context: ExpressionContext
): ExpressionResult {
  try {
    const compiled = jsonata(expression);
    
    // Register custom functions if provided
    if (context.functions) {
      for (const [name, fn] of Object.entries(context.functions)) {
        compiled.registerFunction(name, fn);
      }
    }
    
    const value = compiled.evaluate(context.variables);
    return { value, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { value: null, success: false, error: message };
  }
}

/**
 * Resolve a string template with {{ ... }} expressions.
 *
 * Example:
 *   resolveTemplate("Hello {{ customer.name }}", { customer: { name: "Amina" } })
 *   => "Hello Amina"
 */
export function resolveTemplate(
  template: string,
  variables: Record<string, unknown>,
  options: TemplateResolveOptions = {}
): string {
  const { keepUnresolved = false, strict = false, functions } = options;
  
  return template.replace(TEMPLATE_REGEX, (match, expr) => {
    const trimmedExpr = String(expr).trim();
    
    const result = evaluateExpression(trimmedExpr, {
      variables,
      functions,
    });
    
    if (!result.success) {
      if (strict) {
        throw new Error(`Expression error in "${match}": ${result.error}`);
      }
      return keepUnresolved ? match : '';
    }
    
    // Convert result to string
    if (result.value === null || result.value === undefined) {
      return keepUnresolved ? match : '';
    }
    
    return String(result.value);
  });
}

/**
 * Resolve any value that may contain templates.
 *
 * - Strings: resolve {{ ... }} expressions
 * - Arrays: resolve each element
 * - Objects: resolve each value recursively
 * - Other types: returned as-is
 */
export function resolveValue(
  value: unknown,
  variables: Record<string, unknown>,
  options: TemplateResolveOptions = {}
): unknown {
  if (typeof value === 'string') {
    return resolveTemplate(value, variables, options);
  }
  
  if (Array.isArray(value)) {
    return value.map(item => resolveValue(item, variables, options));
  }
  
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveValue(val, variables, options);
    }
    return result;
  }
  
  return value;
}

/**
 * Resolve an input object using variables.
 * This is the main entry point for workflow step input resolution.
 */
export function resolveInput(
  input: Record<string, unknown>,
  variables: Record<string, unknown>,
  options: TemplateResolveOptions = {}
): Record<string, unknown> {
  return resolveValue(input, variables, options) as Record<string, unknown>;
}

/**
 * Create a default expression context with safe built-in functions.
 * 
 * Note: Non-deterministic functions (like now, uuid) should be injected
 * by the workflow engine at runtime, not computed here.
 */
export function createExpressionContext(
  variables: Record<string, unknown>,
  functions?: Record<string, (...args: unknown[]) => unknown>
): ExpressionContext {
  return {
    variables,
    functions,
  };
}
