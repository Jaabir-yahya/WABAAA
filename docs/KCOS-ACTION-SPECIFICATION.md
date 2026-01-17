# KCOS Action Specification

**Date**: January 17, 2026  
**Version**: 1.0

---

## Overview

Actions are the atomic building blocks of KCOS. Every action is:
- **Self-contained**: Does one thing well
- **Composable**: Can connect to any other action
- **Idempotent**: Safe to retry
- **Observable**: Logs execution for debugging

---

## Action Interface

```typescript
interface Action {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Unique identifier, format: category.name (e.g., 'whatsapp.send') */
  id: string;
  
  /** Category for grouping in UI */
  category: ActionCategory;
  
  /** Human-readable description */
  description: string;
  
  // ═══════════════════════════════════════════════════════════════
  // SCHEMAS
  // ═══════════════════════════════════════════════════════════════
  
  /** JSON Schema defining required/optional inputs */
  inputSchema: JSONSchema7;
  
  /** JSON Schema defining output structure */
  outputSchema: JSONSchema7;
  
  // ═══════════════════════════════════════════════════════════════
  // BEHAVIOR
  // ═══════════════════════════════════════════════════════════════
  
  /** Can this action be retried on failure? */
  retryable: boolean;
  
  /** Is this action safe to execute multiple times with same input? */
  idempotent: boolean;
  
  /** Default retry policy (can be overridden in workflow) */
  defaultRetryPolicy?: RetryPolicy;
  
  // ═══════════════════════════════════════════════════════════════
  // EXECUTION
  // ═══════════════════════════════════════════════════════════════
  
  /** Execute the action */
  execute(input: ActionInput, context: ActionContext): Promise<ActionOutput>;
  
  /** Optional: Undo the action if a later step fails (saga compensation) */
  compensate?(input: ActionInput, context: ActionContext): Promise<void>;
}

type ActionCategory = 
  | 'communication'  // whatsapp, sms, notification
  | 'payment'        // mpesa, payment
  | 'identity'       // actor
  | 'data'           // order, event
  | 'document'       // document, receipt, image
  | 'integration'    // webhook, erp, api
  | 'qr'             // qr
  | 'control';       // condition, parallel, wait, loop
```

---

## Action Input/Output

```typescript
/** Input passed to action.execute() */
interface ActionInput {
  [key: string]: any;  // Shape defined by inputSchema
}

/** Context available during execution */
interface ActionContext {
  /** Tenant/business ID */
  tenantId: string;
  
  /** Workflow instance ID */
  workflowId: string;
  
  /** Correlation ID for tracing related events */
  correlationId: string;
  
  /** All variables accumulated from previous steps */
  variables: Record<string, any>;
  
  /** Unique key for idempotency (prevents duplicate execution) */
  idempotencyKey: string;
  
  /** Current step ID */
  stepId: string;
  
  /** Timestamp when workflow started */
  workflowStartedAt: Date;
}

/** Output returned from action.execute() */
interface ActionOutput {
  /** Did the action succeed? */
  success: boolean;
  
  /** Output data (shape defined by outputSchema) */
  data?: any;
  
  /** Error message if success=false */
  error?: string;
  
  /** Error code for programmatic handling */
  errorCode?: string;
  
  /** Should this be retried? (overrides action.retryable) */
  shouldRetry?: boolean;
}
```

---

## Retry Policy

```typescript
interface RetryPolicy {
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Backoff strategy */
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  
  /** Initial delay between retries */
  initialInterval: string;  // e.g., '1s', '500ms'
  
  /** Maximum delay between retries */
  maxInterval: string;
  
  /** Multiplier for exponential backoff */
  backoffCoefficient?: number;
  
  /** Error types that should NOT be retried */
  nonRetryableErrors?: string[];
}
```

---

## Core Actions Registry

### Communication Actions

#### `whatsapp.send`
Send a WhatsApp message.

```yaml
id: whatsapp.send
category: communication
description: Send a WhatsApp message to a phone number

inputSchema:
  type: object
  required: [to, message]
  properties:
    to:
      type: string
      description: Phone number (254...)
    message:
      type: string
      description: Message text
    template:
      type: string
      description: Optional template name
    variables:
      type: object
      description: Template variables

outputSchema:
  type: object
  properties:
    messageId:
      type: string
    status:
      type: string
      enum: [sent, failed, queued]
```

#### `sms.send`
Send an SMS message (Africa's Talking).

```yaml
id: sms.send
category: communication
description: Send an SMS message

inputSchema:
  type: object
  required: [to, message]
  properties:
    to:
      type: string
    message:
      type: string
      maxLength: 160

outputSchema:
  type: object
  properties:
    messageId:
      type: string
    status:
      type: string
```

#### `notification.push`
Send internal notification.

```yaml
id: notification.push
category: communication
description: Send internal notification to channel

inputSchema:
  type: object
  required: [channel, message]
  properties:
    channel:
      type: string
      enum: [merchant, security, finance, support]
    message:
      type: string
    priority:
      type: string
      enum: [low, normal, high, urgent]
```

---

### Payment Actions

#### `mpesa.initiate`
Initiate M-Pesa STK Push.

```yaml
id: mpesa.initiate
category: payment
description: Initiate M-Pesa STK Push payment

inputSchema:
  type: object
  required: [phone, amount, reference]
  properties:
    phone:
      type: string
      pattern: ^254[0-9]{9}$
    amount:
      type: number
      minimum: 1
      maximum: 150000
    reference:
      type: string
    description:
      type: string

outputSchema:
  type: object
  properties:
    checkoutRequestId:
      type: string
    merchantRequestId:
      type: string
    status:
      type: string
      enum: [initiated, failed]

compensation: payment.void
```

#### `payment.record`
Record a manual payment.

```yaml
id: payment.record
category: payment
description: Record a manual payment (cash, bank transfer)

inputSchema:
  type: object
  required: [orderId, amount, method]
  properties:
    orderId:
      type: string
      format: uuid
    amount:
      type: number
    method:
      type: string
      enum: [cash, bank, cheque]
    reference:
      type: string

outputSchema:
  type: object
  properties:
    paymentId:
      type: string
    newOutstanding:
      type: number
```

---

### Identity Actions

#### `actor.resolve`
Find or create an actor by identifier.

```yaml
id: actor.resolve
category: identity
description: Resolve phone/email/ID to actor, creating if needed

inputSchema:
  type: object
  properties:
    phone:
      type: string
    email:
      type: string
    nationalId:
      type: string

outputSchema:
  type: object
  properties:
    id:
      type: string
    actorType:
      type: string
    displayName:
      type: string
    isNew:
      type: boolean
    trustScore:
      type: number
```

#### `actor.update`
Update actor attributes.

```yaml
id: actor.update
category: identity
description: Update actor metadata

inputSchema:
  type: object
  required: [actorId]
  properties:
    actorId:
      type: string
    displayName:
      type: string
    metadata:
      type: object
```

---

### Data Actions

#### `order.create`
Create a new order.

```yaml
id: order.create
category: data
description: Create a new order

inputSchema:
  type: object
  required: [customerPhone, items, total]
  properties:
    customerPhone:
      type: string
    customerId:
      type: string
    items:
      type: array
      items:
        type: object
        properties:
          product:
            type: string
          quantity:
            type: number
          price:
            type: number
    total:
      type: number
    source:
      type: string
      enum: [whatsapp, qr_code, web, manual]

outputSchema:
  type: object
  properties:
    id:
      type: string
    status:
      type: string
    total:
      type: number
    itemsText:
      type: string

compensation: order.cancel
```

#### `event.log`
Log an event to the event store.

```yaml
id: event.log
category: data
description: Log an event to the event store

inputSchema:
  type: object
  required: [eventType]
  properties:
    streamId:
      type: string
    eventType:
      type: string
    eventData:
      type: object
    actorId:
      type: string

outputSchema:
  type: object
  properties:
    eventId:
      type: string
    globalSequence:
      type: number
```

---

### Document Actions

#### `document.parse`
Parse text/document into structured data.

```yaml
id: document.parse
category: document
description: Parse natural language or document into structured data

inputSchema:
  type: object
  required: [content, type]
  properties:
    content:
      type: string
    type:
      type: string
      enum: [order, invoice, receipt, message]
    config:
      type: object
      description: Parser configuration

outputSchema:
  type: object
  properties:
    type:
      type: string
    confidence:
      type: number
    items:
      type: array
    total:
      type: number
    extractedData:
      type: object
```

---

### QR Actions

#### `qr.generate`
Generate a QR code.

```yaml
id: qr.generate
category: qr
description: Generate a QR code with embedded metadata

inputSchema:
  type: object
  required: [type, data]
  properties:
    type:
      type: string
      enum: [product, invoice, shop, menu, access, id, custom]
    data:
      type: object
    format:
      type: string
      enum: [png, svg]
      default: png
    size:
      type: number
      default: 256

outputSchema:
  type: object
  properties:
    qrCode:
      type: string
      description: Base64 encoded image
    reference:
      type: string
      description: KCOS tracking reference
```

#### `qr.decode`
Decode a QR reference.

```yaml
id: qr.decode
category: qr
description: Decode a KCOS QR reference into data

inputSchema:
  type: object
  required: [reference]
  properties:
    reference:
      type: string

outputSchema:
  type: object
  properties:
    type:
      type: string
    businessId:
      type: string
    data:
      type: object
    timestamp:
      type: number
```

---

### Control Actions

#### `condition.if`
Branch based on condition.

```yaml
id: condition.if
category: control
description: Evaluate condition and branch workflow

inputSchema:
  type: object
  required: [condition]
  properties:
    condition:
      type: string
      description: JSONata expression

outputSchema:
  type: object
  properties:
    result:
      type: boolean
    branch:
      type: string
      enum: [then, else]
```

#### `wait.for`
Wait for time or signal.

```yaml
id: wait.for
category: control
description: Pause workflow for duration or until signal

inputSchema:
  type: object
  properties:
    duration:
      type: string
      description: Duration string (e.g., '5m', '1h', '1d')
    signal:
      type: string
      description: Signal name to wait for
    timeout:
      type: string
      description: Maximum wait time

outputSchema:
  type: object
  properties:
    reason:
      type: string
      enum: [duration_elapsed, signal_received, timeout]
    signalData:
      type: object
```

#### `parallel.all`
Execute steps in parallel.

```yaml
id: parallel.all
category: control
description: Execute multiple steps in parallel, wait for all

inputSchema:
  type: object
  required: [steps]
  properties:
    steps:
      type: array
      items:
        $ref: '#/definitions/WorkflowStep'

outputSchema:
  type: object
  properties:
    results:
      type: array
    allSucceeded:
      type: boolean
```

#### `loop.each`
Iterate over array.

```yaml
id: loop.each
category: control
description: Execute steps for each item in array

inputSchema:
  type: object
  required: [items, steps]
  properties:
    items:
      type: array
    itemVariable:
      type: string
      default: item
    indexVariable:
      type: string
      default: index
    steps:
      type: array

outputSchema:
  type: object
  properties:
    results:
      type: array
    completedCount:
      type: number
```

---

### Integration Actions

#### `webhook.call`
Make HTTP request to external webhook.

```yaml
id: webhook.call
category: integration
description: Call external webhook/API

inputSchema:
  type: object
  required: [url]
  properties:
    url:
      type: string
    method:
      type: string
      enum: [GET, POST, PUT, DELETE]
      default: POST
    headers:
      type: object
    body:
      type: object
    timeout:
      type: number
      default: 30000

outputSchema:
  type: object
  properties:
    statusCode:
      type: number
    body:
      type: object
    headers:
      type: object
```

---

## Creating New Actions

### Template

```typescript
import { Action, ActionInput, ActionOutput, ActionContext } from '../types';
import { withIdempotency } from '../idempotency';

export const myNewAction: Action = {
  id: 'category.name',
  category: 'category',
  description: 'What this action does',
  retryable: true,
  idempotent: true,
  
  inputSchema: {
    type: 'object',
    required: ['requiredField'],
    properties: {
      requiredField: { type: 'string' },
      optionalField: { type: 'number' }
    }
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string' }
    }
  },
  
  async execute(input: ActionInput, context: ActionContext): Promise<ActionOutput> {
    return withIdempotency(
      context.tenantId,
      context.idempotencyKey,
      'category.name',
      input,
      async () => {
        // Your logic here
        const result = await doSomething(input);
        
        return {
          success: true,
          data: { result }
        };
      }
    );
  },
  
  // Optional compensation
  async compensate(input: ActionInput, context: ActionContext): Promise<void> {
    await undoSomething(input);
  }
};
```

### Registration

```typescript
import { actionRegistry } from './registry';
import { myNewAction } from './actions/category/my-new-action';

actionRegistry.register(myNewAction);
```

---

## Testing Actions

```typescript
import { myNewAction } from './my-new-action';

describe('myNewAction', () => {
  const mockContext: ActionContext = {
    tenantId: 'test-tenant',
    workflowId: 'test-workflow',
    correlationId: 'test-correlation',
    variables: {},
    idempotencyKey: 'test-key',
    stepId: 'test-step',
    workflowStartedAt: new Date()
  };
  
  it('should succeed with valid input', async () => {
    const result = await myNewAction.execute(
      { requiredField: 'value' },
      mockContext
    );
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
  
  it('should be idempotent', async () => {
    const input = { requiredField: 'value' };
    
    const result1 = await myNewAction.execute(input, mockContext);
    const result2 = await myNewAction.execute(input, mockContext);
    
    expect(result1.data).toEqual(result2.data);
  });
});
```

---

## Action Lifecycle

```
1. Workflow Engine receives step to execute
2. Engine looks up Action in registry
3. Engine resolves input expressions ({{ variables }})
4. Engine validates input against inputSchema
5. Engine calls action.execute(input, context)
6. Action checks idempotency (skip if already done)
7. Action performs work
8. Action returns ActionOutput
9. Engine validates output against outputSchema
10. Engine stores output in workflow variables
11. If failure occurs later: Engine calls action.compensate()
```

---

**Actions are the atoms of KCOS. Everything else is molecules built from these atoms.**
