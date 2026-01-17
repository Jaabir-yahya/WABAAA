/**
 * KCOS Expression Types
 *
 * Defines the structure of expression evaluation and resolution.
 */

export interface ExpressionContext {
  /** Variables available to expressions */
  variables: Record<string, unknown>;
  
  /** Named functions available to expressions */
  functions?: Record<string, (...args: unknown[]) => unknown>;
}

export interface ExpressionResult {
  /** The evaluated value */
  value: unknown;
  
  /** Whether evaluation succeeded */
  success: boolean;
  
  /** Error message if evaluation failed */
  error?: string;
}

export interface TemplateResolveOptions {
  /** If true, unresolved expressions remain unchanged */
  keepUnresolved?: boolean;
  
  /** If true, strict mode throws on missing variables */
  strict?: boolean;
  
  /** Custom functions to register with JSONata */
  functions?: Record<string, (...args: unknown[]) => unknown>;
}
