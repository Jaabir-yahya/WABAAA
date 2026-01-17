# KCOS Workflow Specification

**Date**: January 17, 2026  
**Version**: 1.0

---

## Overview

Workflows are declarative definitions that wire Actions together. They describe:
- **What triggers the workflow** (event, schedule, manual)
- **What steps to execute** (sequence of actions)
- **How to handle errors** (retry, compensate, notify)
- **How data flows** between steps (expressions)

---

## Workflow Definition Schema

```typescript
interface WorkflowDefinition {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Unique identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this workflow does */
  description: string;
  
  /** Version for tracking changes */
  version?: string;
  
  /** Tags for organization */
  tags?: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // TRIGGER
  // ═══════════════════════════════════════════════════════════════
  
  /** What starts this workflow */
  trigger: WorkflowTrigger;
  
  // ═══════════════════════════════════════════════════════════════
  // STEPS
  // ═══════════════════════════════════════════════════════════════
  
  /** Sequence of steps to execute */
  steps: WorkflowStep[];
  
  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════
  
  /** Global error handling strategy */
  onError?: ErrorHandling;
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  
  /** Is this workflow active? */
  isActive?: boolean;
  
  /** Tenant-specific configuration */
  tenantConfig?: Record<string, any>;
}
```

---

## Triggers

```typescript
interface WorkflowTrigger {
  /** Trigger type */
  type: TriggerType;
  
  /** Optional conditions to filter events */
  conditions?: FilterCondition[];
  
  /** For schedule triggers */
  schedule?: CronExpression;
}

type TriggerType = 
  | 'whatsapp.received'   // WhatsApp message received
  | 'mpesa.callback'      // M-Pesa payment callback
  | 'qr.scanned'          // QR code scanned
  | 'webhook.received'    // External webhook
  | 'schedule.cron'       // Scheduled execution
  | 'manual.trigger'      // Manual/API trigger
  | 'event.emitted';      // Internal event

interface FilterCondition {
  /** Field path to check */
  field: string;  // e.g., "{{ data.text }}"
  
  /** Operator */
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in';
  
  /** Value to compare */
  value: any;
}
```

### Trigger Examples

```yaml
# WhatsApp message containing order keywords
trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.text }}"
      operator: contains
      value: ["nataka", "order", "oda"]
    - field: "{{ data.type }}"
      operator: equals
      value: "text"

# M-Pesa successful payment
trigger:
  type: mpesa.callback
  conditions:
    - field: "{{ data.ResultCode }}"
      operator: equals
      value: 0

# QR code of specific type
trigger:
  type: qr.scanned
  conditions:
    - field: "{{ data.qrType }}"
      operator: equals
      value: "product"

# Daily at 6pm Nairobi time
trigger:
  type: schedule.cron
  schedule: "0 18 * * *"  # CRON expression

# Manual trigger via API
trigger:
  type: manual.trigger
```

---

## Steps

```typescript
interface WorkflowStep {
  /** Unique step identifier */
  id: string;
  
  /** Action to execute */
  action: string;  // Action ID from registry
  
  /** Input mapping */
  input: Record<string, any>;
  
  /** Store output in variable */
  output?: string;
  
  /** Conditional execution */
  when?: string;  // Expression that must be truthy
  
  /** Branching (for condition actions) */
  then?: WorkflowStep[];
  else?: WorkflowStep[];
  
  /** Step-level error handling */
  onError?: 'compensate' | 'continue' | 'abort' | 'retry';
  
  /** Compensation action if later step fails */
  compensation?: string;
  
  /** Retry policy for this step */
  retryPolicy?: RetryPolicy;
  
  /** Timeout for this step */
  timeout?: string;  // e.g., '30s', '5m'
}
```

---

## Expression Language

Expressions use `{{ }}` syntax and are evaluated with JSONata.

### Available Variables

```typescript
{
  // Trigger data
  trigger: {
    type: string,
    data: any,        // Payload from trigger
    timestamp: string
  },
  
  // Tenant configuration
  tenant: {
    id: string,
    name: string,
    config: any
  },
  
  // Step outputs
  steps: {
    [stepId]: {
      output: any
    }
  },
  
  // Named outputs (from step.output)
  [outputName]: any,
  
  // Built-in functions
  now: () => string,      // Current ISO timestamp
  uuid: () => string,     // Generate UUID
  env: (key) => string    // Environment variable
}
```

### Expression Examples

```yaml
# Access trigger data
input:
  phone: "{{ trigger.data.from }}"
  message: "{{ trigger.data.text }}"

# Access previous step output
input:
  orderId: "{{ steps.create_order.output.id }}"
  total: "{{ order.total }}"  # Named output

# Arithmetic
input:
  totalWithTax: "{{ order.total * 1.16 }}"
  discount: "{{ order.total - (order.total * 0.1) }}"

# String concatenation
input:
  message: "{{ 'Order #' & order.id & ' confirmed!' }}"

# Array access
input:
  firstItem: "{{ order.items[0].product }}"
  itemCount: "{{ $count(order.items) }}"

# Conditional expression
input:
  greeting: "{{ order.total > 1000 ? 'VIP Customer!' : 'Thank you!' }}"

# Object construction
input:
  metadata:
    orderId: "{{ order.id }}"
    timestamp: "{{ $now() }}"
```

---

## Error Handling

```typescript
interface ErrorHandling {
  /** Strategy */
  strategy: 'compensate' | 'retry' | 'ignore' | 'notify' | 'abort';
  
  /** Maximum retries (for retry strategy) */
  maxRetries?: number;
  
  /** Backoff configuration */
  backoff?: {
    strategy: 'fixed' | 'linear' | 'exponential';
    initialInterval: string;
    maxInterval: string;
    multiplier?: number;
  };
  
  /** Notification channel (for notify strategy) */
  notifyChannel?: string;
  
  /** Custom error handler workflow */
  errorWorkflow?: string;
}
```

### Error Handling Strategies

| Strategy | Behavior |
|----------|----------|
| `compensate` | Run compensation for all completed steps in reverse |
| `retry` | Retry the failed step according to retry policy |
| `ignore` | Log error and continue to next step |
| `notify` | Send notification and pause workflow |
| `abort` | Stop workflow immediately |

---

## Complete Workflow Examples

### Example 1: Mini Supermarket Order

```yaml
id: mini-supermarket-order
name: Mini Supermarket WhatsApp Order
description: Process WhatsApp orders for mini supermarkets
version: "1.0"
tags: [retail, whatsapp, order]

trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.type }}"
      operator: equals
      value: "text"

steps:
  # Step 1: Resolve customer
  - id: resolve_customer
    action: actor.resolve
    input:
      phone: "{{ trigger.data.from }}"
    output: customer

  # Step 2: Parse the order
  - id: parse_order
    action: document.parse
    input:
      content: "{{ trigger.data.text }}"
      type: "order"
      config: "{{ tenant.parserConfig }}"
    output: parsed

  # Step 3: Check if valid order
  - id: check_order
    action: condition.if
    input:
      condition: "{{ parsed.confidence >= 0.6 and $count(parsed.items) > 0 }}"
    then:
      # Valid order path
      - id: create_order
        action: order.create
        input:
          customerPhone: "{{ customer.phone }}"
          customerId: "{{ customer.id }}"
          items: "{{ parsed.items }}"
          total: "{{ parsed.total }}"
          source: "whatsapp"
        output: order
        compensation: order.cancel

      - id: initiate_payment
        action: mpesa.initiate
        input:
          phone: "{{ customer.phone }}"
          amount: "{{ order.total }}"
          reference: "{{ order.id }}"
          description: "Order {{ order.id }}"
        output: payment
        retryPolicy:
          maxRetries: 2
          backoff:
            strategy: exponential
            initialInterval: "2s"
            maxInterval: "30s"

      - id: confirm_order
        action: whatsapp.send
        input:
          to: "{{ customer.phone }}"
          message: |
            Asante {{ customer.displayName }}! 
            Oda yako: {{ order.itemsText }}
            Jumla: KSh {{ order.total }}
            Subiri M-Pesa prompt.

      - id: log_success
        action: event.log
        input:
          eventType: "order.created_via_whatsapp"
          eventData:
            orderId: "{{ order.id }}"
            customerId: "{{ customer.id }}"
            total: "{{ order.total }}"

    else:
      # Invalid order - send help
      - id: send_help
        action: whatsapp.send
        input:
          to: "{{ trigger.data.from }}"
          message: |
            Samahani, sijaelewa oda yako.
            Andika kama: sukari 2kg, maziwa 1 lita

onError:
  strategy: compensate
  notifyChannel: merchant
```

### Example 2: QR Warehouse Access

```yaml
id: warehouse-access
name: QR Warehouse Access Control
description: Control warehouse access via QR scan
version: "1.0"
tags: [security, qr, access]

trigger:
  type: qr.scanned
  conditions:
    - field: "{{ data.qrType }}"
      operator: equals
      value: "access"

steps:
  - id: decode_qr
    action: qr.decode
    input:
      reference: "{{ trigger.data.reference }}"
    output: qrData

  - id: resolve_person
    action: actor.resolve
    input:
      nationalId: "{{ qrData.nationalId }}"
    output: person

  - id: check_authorization
    action: condition.if
    input:
      condition: "{{ person.metadata.authorizedLocations contains qrData.location }}"
    then:
      - id: log_entry
        action: event.log
        input:
          streamId: "{{ 'access-' & qrData.location }}"
          eventType: "access.granted"
          eventData:
            personId: "{{ person.id }}"
            personName: "{{ person.displayName }}"
            location: "{{ qrData.location }}"
            timestamp: "{{ $now() }}"

      - id: notify_supervisor
        action: whatsapp.send
        input:
          to: "{{ tenant.config.supervisorPhone }}"
          message: "{{ person.displayName }} ameingia {{ qrData.location }}"

    else:
      - id: log_denied
        action: event.log
        input:
          eventType: "access.denied"
          eventData:
            personId: "{{ person.id }}"
            location: "{{ qrData.location }}"
            reason: "not_authorized"

      - id: alert_security
        action: notification.push
        input:
          channel: "security"
          priority: "high"
          message: "Unauthorized access attempt at {{ qrData.location }} by {{ person.displayName }}"

onError:
  strategy: notify
  notifyChannel: security
```

### Example 3: Payment Reminder Escalation

```yaml
id: payment-reminder
name: Payment Reminder Escalation
description: Escalating payment reminders over time
version: "1.0"
tags: [payment, reminder, escalation]

trigger:
  type: schedule.cron
  schedule: "0 9 * * *"  # Daily at 9am

steps:
  # Get overdue orders
  - id: get_overdue
    action: data.query
    input:
      table: "orders"
      filter:
        status: ["pending", "partial"]
        created_at_lt: "{{ $now() - 'P1D' }}"  # Older than 1 day
    output: overdueOrders

  # Process each order
  - id: process_each
    action: loop.each
    input:
      items: "{{ overdueOrders }}"
      itemVariable: "order"
      steps:
        - id: get_customer
          action: actor.resolve
          input:
            phone: "{{ order.customer_phone }}"
          output: customer

        - id: calculate_days
          action: data.calculate
          input:
            expression: "{{ $floor(($now() - order.created_at) / 86400000) }}"
          output: daysSinceOrder

        - id: choose_channel
          action: condition.if
          input:
            condition: "{{ daysSinceOrder <= 2 }}"
          then:
            # Day 1-2: WhatsApp
            - id: whatsapp_reminder
              action: whatsapp.send
              input:
                to: "{{ customer.phone }}"
                message: |
                  Habari {{ customer.displayName }}!
                  Una deni ya KSh {{ order.outstanding_amount }}.
                  Lipa leo kupitia M-Pesa.

          else:
            - id: check_day_4
              action: condition.if
              input:
                condition: "{{ daysSinceOrder <= 4 }}"
              then:
                # Day 3-4: SMS
                - id: sms_reminder
                  action: sms.send
                  input:
                    to: "{{ customer.phone }}"
                    message: "Deni: KSh {{ order.outstanding_amount }}. Lipa sasa."

              else:
                # Day 5+: Final notice + notify merchant
                - id: final_notice
                  action: whatsapp.send
                  input:
                    to: "{{ customer.phone }}"
                    message: |
                      ONYO LA MWISHO: Deni ya KSh {{ order.outstanding_amount }}.
                      Lipa leo kuepuka vikwazo.

                - id: notify_merchant
                  action: notification.push
                  input:
                    channel: "merchant"
                    priority: "high"
                    message: |
                      Customer {{ customer.displayName }} has overdue payment.
                      Amount: KSh {{ order.outstanding_amount }}
                      Days overdue: {{ daysSinceOrder }}

onError:
  strategy: ignore  # Continue processing other orders
```

### Example 4: Invoice Document Processing

```yaml
id: invoice-processing
name: Automatic Invoice Processing
description: Extract data from invoice documents and create purchase orders
version: "1.0"
tags: [document, invoice, automation]

trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.type }}"
      operator: equals
      value: "document"

steps:
  - id: download_document
    action: document.download
    input:
      mediaId: "{{ trigger.data.document.id }}"
    output: documentContent

  - id: parse_invoice
    action: document.parse
    input:
      content: "{{ documentContent }}"
      type: "invoice"
    output: invoice

  - id: check_confidence
    action: condition.if
    input:
      condition: "{{ invoice.confidence >= 0.7 }}"
    then:
      - id: resolve_supplier
        action: actor.resolve
        input:
          name: "{{ invoice.supplierName }}"
        output: supplier

      - id: create_po
        action: order.create
        input:
          type: "purchase_order"
          supplierId: "{{ supplier.id }}"
          items: "{{ invoice.lineItems }}"
          total: "{{ invoice.total }}"
          dueDate: "{{ invoice.dueDate }}"
          reference: "{{ invoice.invoiceNumber }}"
        output: purchaseOrder

      - id: notify_finance
        action: whatsapp.send
        input:
          to: "{{ tenant.config.financePhone }}"
          message: |
            PO #{{ purchaseOrder.id }} created from invoice.
            Supplier: {{ supplier.displayName }}
            Total: KSh {{ purchaseOrder.total }}
            Due: {{ purchaseOrder.dueDate }}

      - id: confirm_receipt
        action: whatsapp.send
        input:
          to: "{{ trigger.data.from }}"
          message: "Invoice processed. PO #{{ purchaseOrder.id }} created."

    else:
      - id: manual_review
        action: notification.push
        input:
          channel: "finance"
          message: "Invoice requires manual review (low confidence)"
          metadata:
            documentId: "{{ documentContent.id }}"
            senderPhone: "{{ trigger.data.from }}"

onError:
  strategy: notify
  notifyChannel: finance
```

---

## Workflow Storage

```sql
-- Workflow definitions
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES businesses(id),
    
    workflow_id TEXT NOT NULL,  -- User-defined ID
    name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0',
    
    definition JSONB NOT NULL,  -- Full workflow YAML/JSON
    
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, workflow_id)
);

-- Enable RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_definitions
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Workflow instances (running/completed)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    
    definition_id UUID REFERENCES workflow_definitions(id),
    workflow_id TEXT NOT NULL,
    
    temporal_workflow_id TEXT,  -- Temporal.io workflow ID
    
    status TEXT NOT NULL DEFAULT 'running',
    -- running, completed, failed, compensating, cancelled
    
    trigger_data JSONB NOT NULL,
    variables JSONB DEFAULT '{}',
    
    current_step TEXT,
    error TEXT,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Workflow step events (for history/replay)
CREATE TABLE workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id),
    
    step_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    
    event_type TEXT NOT NULL,
    -- step.started, step.completed, step.failed, step.compensated
    
    input JSONB,
    output JSONB,
    error TEXT,
    
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_events_instance ON workflow_events(instance_id);
```

---

## Workflow Lifecycle

```
1. TRIGGER EVENT RECEIVED
   │
   ├─ Webhook router receives event
   ├─ Matches event to workflow trigger(s)
   ├─ Filters by conditions
   │
2. WORKFLOW STARTED
   │
   ├─ Create workflow instance
   ├─ Start Temporal workflow
   ├─ Initialize variables with trigger data
   │
3. STEP EXECUTION (for each step)
   │
   ├─ Check 'when' condition
   ├─ Resolve input expressions
   ├─ Execute action (Temporal activity)
   ├─ Store output in variables
   ├─ Log step event
   │
4. BRANCHING (if then/else)
   │
   ├─ Evaluate branch condition
   ├─ Execute appropriate branch steps
   │
5. COMPLETION
   │
   ├─ All steps completed → status = completed
   │
   OR
   │
5. ERROR HANDLING
   │
   ├─ Step fails
   ├─ Apply error strategy (retry/compensate/notify/abort)
   ├─ If compensate: run compensation in reverse order
   │
6. WORKFLOW ENDED
   │
   ├─ Update instance status
   └─ Emit workflow.completed/failed event
```

---

**Workflows are the programs. Actions are the instructions. The engine is the runtime.**
