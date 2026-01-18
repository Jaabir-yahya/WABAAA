/**
 * loop.each Action
 *
 * Execute an action for each item in an array.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';
import { actionRegistry } from '../registry';
import { resolveInput } from '../../expressions/evaluator';
import type { ActionInput, ActionOutput, ActionContext } from '../types';

export const loopEachAction = defineAction({
  id: 'loop.each',
  category: 'control',
  description: 'Execute an action for each item in an array',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      items: { type: 'array', description: 'Array of items to iterate over' },
      action: stringProp('Action ID to execute for each item'),
      itemVar: stringProp('Variable name for current item', { default: 'item' }),
      input: { type: 'object', description: 'Input template for action' },
    },
    ['items', 'action', 'input'],
    'Input for loop.each action'
  ),

  outputSchema: objectSchema({
    results: { type: 'array', description: 'Results for each item' },
    count: { type: 'number', description: 'Number of items processed' },
  }),

  retryable: false,
  idempotent: false,

  async execute(input, context) {
    const items = (input.items as unknown[]) || [];
    const actionId = input.action as string;
    const itemVar = (input.itemVar as string) || 'item';
    const inputTemplate = (input.input as Record<string, unknown>) || {};

    const action = actionRegistry.get(actionId);
    if (!action) {
      return failure(`Action not found: ${actionId}`, {
        errorCode: 'ACTION_NOT_FOUND',
        shouldRetry: false,
      });
    }

    const results: ActionOutput[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const variables = {
        ...context.variables,
        [itemVar]: item,
        index,
      };

      const resolvedInput = resolveInput(inputTemplate, variables);
      const actionContext: ActionContext = {
        ...context,
        variables,
        stepId: `${context.stepId}:${index}`,
      };

      const result = await action.execute(resolvedInput as ActionInput, actionContext);
      results.push(result);

      if (!result.success) {
        return failure(`Loop failed at index ${index}: ${result.error}`, {
          errorCode: 'LOOP_FAILED',
          shouldRetry: false,
          data: { results },
        });
      }
    }

    return success({ results, count: items.length });
  },
});
