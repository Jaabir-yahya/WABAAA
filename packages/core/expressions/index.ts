/**
 * KCOS Expressions
 *
 * Exports for expression evaluation and template resolution.
 */

export type {
  ExpressionContext,
  ExpressionResult,
  TemplateResolveOptions,
} from './types';

export {
  evaluateExpression,
  resolveTemplate,
  resolveValue,
  resolveInput,
  createExpressionContext,
} from './evaluator';
