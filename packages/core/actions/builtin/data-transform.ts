/**
 * data.transform Action
 * 
 * Transform data using a mapping specification.
 * Useful for reshaping data between steps in a workflow.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

export const dataTransformAction = defineAction({
  id: 'data.transform',
  category: 'data',
  description: 'Transform and reshape data using a mapping specification',
  version: '1.0.0',
  
  inputSchema: objectSchema(
    {
      source: {
        type: 'object',
        description: 'The source data to transform',
      },
      mapping: {
        type: 'object',
        description: 'Mapping specification: { outputField: "{{ sourceField }}" }',
      },
      defaults: {
        type: 'object',
        description: 'Default values for missing fields',
      },
    },
    ['mapping'],
    'Input for data.transform action'
  ),
  
  outputSchema: objectSchema({
    transformed: { type: 'object', description: 'The transformed data' },
    fieldsProcessed: { type: 'number', description: 'Number of fields processed' },
  }),
  
  retryable: false,
  idempotent: true,
  
  async execute(input, context) {
    const source = (input.source as Record<string, unknown>) || context.variables;
    const mapping = input.mapping as Record<string, unknown>;
    const defaults = (input.defaults as Record<string, unknown>) || {};
    
    if (!mapping || typeof mapping !== 'object') {
      return failure('mapping must be an object', { 
        errorCode: 'INVALID_MAPPING', 
        shouldRetry: false 
      });
    }
    
    const transformed: Record<string, unknown> = {};
    let fieldsProcessed = 0;
    
    for (const [outputKey, mappingValue] of Object.entries(mapping)) {
      try {
        let value: unknown;
        
        if (typeof mappingValue === 'string') {
          // Check for expression syntax {{ ... }}
          const exprMatch = mappingValue.match(/^\{\{\s*([^}]+)\s*\}\}$/);
          if (exprMatch) {
            const path = exprMatch[1].trim();
            value = getNestedValue(source, path);
          } else {
            // Literal string value
            value = mappingValue;
          }
        } else {
          // Non-string values are used directly
          value = mappingValue;
        }
        
        // Apply default if value is undefined
        if (value === undefined && outputKey in defaults) {
          value = defaults[outputKey];
        }
        
        transformed[outputKey] = value;
        fieldsProcessed++;
        
      } catch (error) {
        console.warn(`[data.transform] Error processing field "${outputKey}":`, error);
        // Continue with other fields
      }
    }
    
    return success({
      transformed,
      fieldsProcessed,
    });
  },
});

/**
 * Get a nested value from an object using dot notation
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
