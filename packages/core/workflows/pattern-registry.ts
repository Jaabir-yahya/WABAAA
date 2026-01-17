/**
 * KCOS Pattern Registry
 * 
 * Manages reusable workflow patterns that can be composed
 * into industry-specific workflows.
 */

import { WorkflowDefinition } from './types';
import { loadWorkflowDefinitionFromString } from './loader';

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PatternId = 
  | 'pattern.order-intake.v1'
  | 'pattern.payment-collection.v1'
  | 'pattern.identity-resolution.v1'
  | 'pattern.status-notification.v1'
  | 'pattern.daily-reconciliation.v1';

export interface PatternDefinition {
  /** Pattern identifier */
  id: PatternId;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what the pattern does */
  description: string;
  
  /** Version string */
  version: string;
  
  /** Tags for categorization */
  tags: string[];
  
  /** The underlying workflow definition */
  workflow: WorkflowDefinition;
  
  /** Industries this pattern applies to */
  industries: string[];
  
  /** Input parameters the pattern expects */
  inputParams: PatternParam[];
  
  /** Output variables the pattern produces */
  outputParams: PatternParam[];
}

export interface PatternParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
}

export interface PatternMetadata {
  id: PatternId;
  name: string;
  description: string;
  version: string;
  tags: string[];
  industries: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export class PatternRegistry {
  private patterns = new Map<PatternId, PatternDefinition>();

  /**
   * Register a pattern from YAML content
   */
  registerFromYaml(yaml: string, metadata: Omit<PatternDefinition, 'workflow'>): void {
    const { definition } = loadWorkflowDefinitionFromString(yaml);
    
    const pattern: PatternDefinition = {
      ...metadata,
      workflow: definition,
    };
    
    this.patterns.set(metadata.id, pattern);
    console.log(`[PatternRegistry] Registered pattern: ${metadata.id}`);
  }

  /**
   * Register a pattern directly
   */
  register(pattern: PatternDefinition): void {
    this.patterns.set(pattern.id, pattern);
    console.log(`[PatternRegistry] Registered pattern: ${pattern.id}`);
  }

  /**
   * Get a pattern by ID
   */
  get(id: PatternId): PatternDefinition | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get a pattern or throw if not found
   */
  getOrThrow(id: PatternId): PatternDefinition {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      throw new Error(`Pattern not found: ${id}`);
    }
    return pattern;
  }

  /**
   * Check if pattern exists
   */
  has(id: PatternId): boolean {
    return this.patterns.has(id);
  }

  /**
   * List all patterns
   */
  listAll(): PatternMetadata[] {
    return Array.from(this.patterns.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      tags: p.tags,
      industries: p.industries,
    }));
  }

  /**
   * List patterns by tag
   */
  listByTag(tag: string): PatternMetadata[] {
    return this.listAll().filter(p => p.tags.includes(tag));
  }

  /**
   * List patterns by industry
   */
  listByIndustry(industry: string): PatternMetadata[] {
    return this.listAll().filter(p => 
      p.industries.includes(industry) || p.industries.includes('universal')
    );
  }

  /**
   * Get pattern count
   */
  count(): number {
    return this.patterns.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const patternRegistry = new PatternRegistry();

/**
 * Create a new pattern registry (for testing)
 */
export function createPatternRegistry(): PatternRegistry {
  return new PatternRegistry();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default metadata for built-in patterns
 */
export const PATTERN_METADATA: Record<PatternId, Omit<PatternDefinition, 'workflow'>> = {
  'pattern.order-intake.v1': {
    id: 'pattern.order-intake.v1',
    name: 'Universal Order Intake',
    description: 'Receives and processes orders from any channel',
    version: '1.0',
    tags: ['pattern', 'order', 'intake', 'universal'],
    industries: ['retail', 'restaurant', 'automotive', 'horticulture', 'healthcare'],
    inputParams: [
      { name: 'trigger.from', type: 'string', required: true, description: 'Customer phone number' },
      { name: 'trigger.text', type: 'string', required: true, description: 'Order message text' },
    ],
    outputParams: [
      { name: 'customer', type: 'object', required: true, description: 'Resolved customer record' },
      { name: 'order', type: 'object', required: false, description: 'Created order (if parsing succeeded)' },
    ],
  },
  'pattern.payment-collection.v1': {
    id: 'pattern.payment-collection.v1',
    name: 'Universal Payment Collection',
    description: 'Collects payments via M-Pesa STK Push',
    version: '1.0',
    tags: ['pattern', 'payment', 'mpesa', 'universal'],
    industries: ['retail', 'restaurant', 'automotive', 'horticulture', 'healthcare'],
    inputParams: [
      { name: 'trigger.orderId', type: 'string', required: true, description: 'Order ID to pay for' },
      { name: 'trigger.phone', type: 'string', required: true, description: 'Customer phone number' },
      { name: 'trigger.amount', type: 'number', required: true, description: 'Amount to collect' },
    ],
    outputParams: [
      { name: 'stkPush', type: 'object', required: true, description: 'STK push response' },
    ],
  },
  'pattern.identity-resolution.v1': {
    id: 'pattern.identity-resolution.v1',
    name: 'Universal Identity Resolution',
    description: 'Resolves customer identity from phone or QR',
    version: '1.0',
    tags: ['pattern', 'identity', 'actor', 'universal'],
    industries: ['retail', 'restaurant', 'automotive', 'horticulture', 'healthcare'],
    inputParams: [
      { name: 'trigger.phone', type: 'string', required: true, description: 'Customer phone number' },
      { name: 'trigger.qrData', type: 'string', required: false, description: 'QR code data' },
    ],
    outputParams: [
      { name: 'actor', type: 'object', required: true, description: 'Resolved actor record' },
    ],
  },
  'pattern.status-notification.v1': {
    id: 'pattern.status-notification.v1',
    name: 'Universal Status Notification',
    description: 'Sends status updates via WhatsApp/SMS',
    version: '1.0',
    tags: ['pattern', 'notification', 'whatsapp', 'sms', 'universal'],
    industries: ['retail', 'restaurant', 'automotive', 'horticulture', 'healthcare'],
    inputParams: [
      { name: 'trigger.data.eventType', type: 'string', required: true, description: 'Event type' },
      { name: 'trigger.data.customerPhone', type: 'string', required: true, description: 'Customer phone' },
      { name: 'trigger.data.message', type: 'string', required: true, description: 'Message to send' },
    ],
    outputParams: [
      { name: 'whatsappResult', type: 'object', required: true, description: 'WhatsApp send result' },
    ],
  },
  'pattern.daily-reconciliation.v1': {
    id: 'pattern.daily-reconciliation.v1',
    name: 'Daily Business Reconciliation',
    description: 'End-of-day business summary report',
    version: '1.0',
    tags: ['pattern', 'reconciliation', 'reporting', 'scheduled', 'universal'],
    industries: ['retail', 'restaurant', 'automotive', 'horticulture', 'healthcare'],
    inputParams: [
      { name: 'trigger.businessId', type: 'string', required: true, description: 'Business ID' },
      { name: 'trigger.ownerPhone', type: 'string', required: true, description: 'Owner phone number' },
      { name: 'trigger.metrics', type: 'object', required: true, description: 'Pre-aggregated metrics' },
    ],
    outputParams: [
      { name: 'report', type: 'object', required: true, description: 'Formatted report data' },
    ],
  },
};
