/**
 * http.request Action
 * 
 * Make HTTP requests to external services.
 * Essential for integrations with external APIs.
 */

import { defineAction, success, failure, objectSchema, stringProp, numberProp } from '../helpers';

export const httpRequestAction = defineAction({
  id: 'http.request',
  category: 'integration',
  description: 'Make HTTP requests to external services',
  version: '1.0.0',
  
  inputSchema: objectSchema(
    {
      url: stringProp('The URL to request'),
      method: stringProp('HTTP method', { 
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET',
      }),
      headers: {
        type: 'object',
        description: 'HTTP headers to include',
      },
      body: {
        type: 'object',
        description: 'Request body (for POST/PUT/PATCH)',
      },
      timeout: numberProp('Timeout in milliseconds', { 
        default: 30000,
        minimum: 1000,
        maximum: 120000,
      }),
    },
    ['url'],
    'Input for http.request action'
  ),
  
  outputSchema: objectSchema({
    status: { type: 'number', description: 'HTTP status code' },
    statusText: { type: 'string', description: 'HTTP status text' },
    headers: { type: 'object', description: 'Response headers' },
    body: { type: 'object', description: 'Response body (parsed JSON)' },
    ok: { type: 'boolean', description: 'Whether status is 2xx' },
  }),
  
  retryable: true,
  idempotent: false, // POST/PUT/DELETE may not be idempotent
  
  defaultRetryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialIntervalMs: 1000,
    maxIntervalMs: 10000,
    backoffCoefficient: 2,
    nonRetryableErrors: ['INVALID_URL', 'TIMEOUT'],
  },
  
  timeoutMs: 30000,
  
  async execute(input, context) {
    const url = input.url as string;
    const method = (input.method as string) || 'GET';
    const headers = (input.headers as Record<string, string>) || {};
    const body = input.body as Record<string, unknown> | undefined;
    const timeoutMs = (input.timeout as number) || 30000;
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return failure(`Invalid URL: ${url}`, { 
        errorCode: 'INVALID_URL', 
        shouldRetry: false 
      });
    }
    
    // Prepare request options
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KCOS/1.0',
        'X-Correlation-ID': context.correlationId,
        ...headers,
      },
    };
    
    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    requestInit.signal = controller.signal;
    
    try {
      console.log(`[http.request] ${method} ${url}`);
      
      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);
      
      // Parse response body
      let responseBody: unknown;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = null;
        }
      } else {
        responseBody = await response.text();
      }
      
      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Check for error status
      if (!response.ok) {
        return failure(
          `HTTP ${response.status}: ${response.statusText}`,
          {
            errorCode: `HTTP_${response.status}`,
            shouldRetry: response.status >= 500, // Retry server errors
            data: {
              status: response.status,
              statusText: response.statusText,
              body: responseBody,
            },
          }
        );
      }
      
      return success({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        ok: true,
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return failure(`Request timed out after ${timeoutMs}ms`, {
            errorCode: 'TIMEOUT',
            shouldRetry: true,
          });
        }
        
        return failure(`Request failed: ${error.message}`, {
          errorCode: 'REQUEST_FAILED',
          shouldRetry: true,
        });
      }
      
      return failure('Unknown error during request', {
        errorCode: 'UNKNOWN_ERROR',
        shouldRetry: true,
      });
    }
  },
});
