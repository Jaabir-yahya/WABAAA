/**
 * debug.log Action
 * 
 * The simplest possible action - logs a message to console.
 * Useful for debugging workflows and testing the engine.
 */

import { defineAction, success, objectSchema, stringProp } from '../helpers';

export const debugLogAction = defineAction({
  id: 'debug.log',
  category: 'debug',
  description: 'Log a message to the console for debugging',
  version: '1.0.0',
  
  inputSchema: objectSchema(
    {
      message: stringProp('The message to log'),
      level: stringProp('Log level', { 
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info',
      }),
      data: {
        type: 'object',
        description: 'Optional data to include in the log',
      },
    },
    ['message'],
    'Input for debug.log action'
  ),
  
  outputSchema: objectSchema({
    logged: { type: 'boolean', description: 'Whether the message was logged' },
    timestamp: { type: 'string', description: 'ISO timestamp when logged' },
  }),
  
  retryable: false,
  idempotent: true,
  
  async execute(input, context) {
    const level = (input.level as string) || 'info';
    const message = input.message as string;
    const data = input.data;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${context.workflowId}/${context.stepId}]`;
    
    // Build log message
    const logMessage = data 
      ? `${prefix} ${message} ${JSON.stringify(data)}`
      : `${prefix} ${message}`;
    
    // Log at appropriate level
    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      case 'info':
      default:
        console.log(logMessage);
    }
    
    return success({
      logged: true,
      timestamp,
    });
  },
});
