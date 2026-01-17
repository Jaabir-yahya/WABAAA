# KCOS Lego Architecture - The Modular Foundation

**Date**: January 17, 2026  
**Status**: APPROVED FOR IMPLEMENTATION  
**Version**: 1.0

---

## Executive Summary

Kenya Commerce OS (KCOS) is built as a **composable system** where everything is a modular block. We don't prescribe specific workflows - we provide atomic Actions that clients wire together. This future-proofs the system for use cases we haven't imagined.

**Core Insight**: Infinite workflows come from finite, composable actions.

---

## The Mental Model

```
TRADITIONAL APPROACH (Wrong for Kenya):
  "Order-to-Payment Workflow" ← Fixed, prescriptive, limited
  
KCOS APPROACH (Correct):
  Actions (Lego Blocks):
    [whatsapp.send] [mpesa.initiate] [qr.generate] [order.create] [event.log]
    
  Workflows = Any combination:
    Client A: whatsapp.receive → parse → order.create → mpesa.initiate
    Client B: qr.scan → actor.resolve → inventory.check → whatsapp.send
    Client C: document.parse → order.create → notification.send
    Client D: (something we haven't imagined yet)
```

The system is like **Zapier/n8n for Kenyan commerce** - you define the blocks, clients wire them together.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE KCOS LEGO SET                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGERS (What starts a workflow)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │whatsapp  │ │  mpesa   │ │   qr     │ │ schedule │           │
│  │.received │ │.callback │ │.scanned  │ │.trigger  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ACTIONS (What happens)                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │whatsapp  │ │  mpesa   │ │   qr     │ │  order   │           │
│  │  .send   │ │.initiate │ │.generate │ │ .create  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  actor   │ │  event   │ │ document │ │   sms    │           │
│  │.resolve  │ │  .log    │ │ .parse   │ │  .send   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ payment  │ │inventory │ │notification│ │ webhook │           │
│  │.record   │ │ .check   │ │  .push   │ │  .call  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  CONTROL (How it flows)                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │condition │ │ parallel │ │   wait   │ │   loop   │           │
│  │   .if    │ │  .all    │ │  .for    │ │  .each   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  WIRE THEM TOGETHER = ANY WORKFLOW                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Architecture?

### The Nairobi Reality

| Challenge | How Lego Solves It |
|-----------|-------------------|
| We don't know all QR use cases | QR actions can be wired into ANY workflow |
| Different clients have different flows | Each client defines their own workflow |
| Need to add new capabilities | Add new action, all workflows can use it |
| Existing code must keep working | Existing code becomes action wrappers |
| Must handle future requirements | New actions + new workflows = infinite combinations |

### Industry Validation

This architecture matches how modern systems work:

- **Temporal.io**: Workflows + Activities (our Workflows + Actions)
- **Zapier/n8n**: Triggers + Actions + Flows
- **AWS Step Functions**: State machines with Lambda functions
- **CNCF Serverless Workflow**: Declarative workflow DSL

---

## Core Components

### 1. Actions (The Lego Blocks)

Every action has the same interface - this is what makes them composable:

```typescript
interface Action {
  // Identity
  id: string;           // 'whatsapp.send', 'mpesa.initiate', etc.
  category: string;     // 'communication', 'payment', 'data', 'control'
  
  // Schema (what it needs, what it returns)
  inputSchema: JSONSchema;   // Validates input
  outputSchema: JSONSchema;  // Documents output
  
  // Execution
  execute(input: ActionInput, context: ActionContext): Promise<ActionOutput>;
  
  // Compensation (undo if later step fails)
  compensate?(input: ActionInput, context: ActionContext): Promise<void>;
  
  // Metadata
  description: string;
  retryable: boolean;
  idempotent: boolean;
}
```

### 2. Action Registry

A central registry holds all available actions:

```typescript
class ActionRegistry {
  private actions: Map<string, Action> = new Map();
  
  register(action: Action): void;
  get(actionId: string): Action | undefined;
  list(): ActionMetadata[];
  listByCategory(category: string): ActionMetadata[];
}
```

### 3. Workflow Definitions

Workflows are declarative YAML/JSON that wire actions together:

```yaml
id: "client-a-order-flow"
name: "Mini Supermarket Order"

trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.text }}"
      contains: ["nataka", "order"]

steps:
  - id: parse_message
    action: document.parse
    input:
      text: "{{ trigger.data.text }}"
    output: parsed

  - id: create_order
    action: order.create
    input:
      items: "{{ parsed.items }}"
    output: order

  - id: initiate_payment
    action: mpesa.initiate
    input:
      phone: "{{ trigger.data.from }}"
      amount: "{{ order.total }}"
    compensation: order.cancel

  - id: send_confirmation
    action: whatsapp.send
    input:
      to: "{{ trigger.data.from }}"
      message: "Asante! Jumla: KSh {{ order.total }}"
```

### 4. Workflow Engine (Powered by Temporal.io)

The engine executes workflow definitions using Temporal.io for durability:

```typescript
class TemporalWorkflowEngine {
  async start(workflowDef: WorkflowDefinition, triggerEvent: TriggerEvent) {
    return await this.client.workflow.start(executeWorkflowDefinition, {
      taskQueue: 'kenya-commerce',
      workflowId: `wf_${workflowDef.id}_${generateId()}`,
      args: [workflowDef, triggerEvent]
    });
  }
}
```

---

## Action Categories

| Category | Actions | Purpose |
|----------|---------|---------|
| **communication** | whatsapp.send, sms.send, notification.push | Send messages |
| **payment** | mpesa.initiate, mpesa.verify, payment.record | Handle money |
| **identity** | actor.resolve, actor.create, actor.update | Manage participants |
| **data** | order.create, order.update, event.log | Store information |
| **document** | document.parse, receipt.extract, image.ocr | Process files |
| **integration** | webhook.call, erp.sync, api.request | External systems |
| **qr** | qr.generate, qr.decode, qr.track | QR code operations |
| **control** | condition.if, parallel.all, wait.for, loop.each | Flow control |

---

## Expression Language

Workflows use `{{ expression }}` syntax to connect outputs to inputs.

**Implementation**: Use JSONata for safe, deterministic evaluation:

```typescript
import jsonata from 'jsonata';

function resolveInput(template: string, variables: Record<string, any>): any {
  const expression = jsonata(template);
  return expression.evaluate(variables);
}
```

**Examples**:
- `{{ trigger.data.phone }}` - Access trigger data
- `{{ steps.parse.output.total }}` - Access previous step output
- `{{ order.total * 1.16 }}` - Arithmetic expressions
- `{{ items[0].product }}` - Array access

---

## Error Handling & Compensation

### Retry Policies (Per Step)

```yaml
steps:
  - id: initiate_payment
    action: mpesa.initiate
    retryPolicy:
      maxRetries: 3
      backoffStrategy: exponential
      initialInterval: 1s
      maxInterval: 30s
    onError: compensate
```

### Compensation (Saga Pattern)

When a step fails, previously completed steps are rolled back in reverse order:

```
Step 1: order.create ✓ (compensation: order.cancel)
Step 2: payment.initiate ✓ (compensation: payment.void)
Step 3: notification.send ✗ FAILED

Compensation runs:
  → payment.void
  → order.cancel
```

---

## Workflow History (Event Sourcing)

Every workflow execution is recorded as append-only events:

```sql
CREATE TABLE workflow_events (
    id UUID PRIMARY KEY,
    workflow_instance_id UUID NOT NULL,
    step_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'step.started', 'step.completed', 'step.failed'
    input JSONB,
    output JSONB,
    error TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

This enables:
- Debugging failed workflows
- Replaying from any point
- Audit trail for compliance

---

## Security & Multi-Tenancy

### Tenant Isolation

All workflow tables include `tenant_id` with RLS:

```sql
CREATE POLICY tenant_isolation ON workflow_definitions
    USING (tenant_id = current_setting('app.current_tenant_id', true));
```

### Action Context

Every action execution receives tenant context:

```typescript
interface ActionContext {
  tenantId: string;
  workflowId: string;
  correlationId: string;
  variables: Record<string, any>;
  idempotencyKey: string;
}
```

---

## Converting Existing Code

Current Edge Functions become Actions or Triggers:

| Current Edge Function | Becomes |
|----------------------|---------|
| `whatsapp-webhook` | Trigger: `whatsapp.received` |
| `mpesa-callback` | Trigger: `mpesa.callback` |
| `generate-qr` | Action: `qr.generate` |
| `generate-payment-link` | Action: `mpesa.initiate` |
| `send-reminders` | Workflow using actions |
| `daily-summary` | Workflow using actions |
| `create-order` | Action: `order.create` |
| `record-payment` | Action: `payment.record` |

---

## Implementation Priority

### Phase 1: The Language (Week 1-2)
- Action interface and registry
- 10 core actions
- Expression evaluator (JSONata)

### Phase 2: The Interpreter (Week 2-3)
- Workflow definition format
- Temporal.io integration
- Workflow engine

### Phase 3: First Client Workflow (Week 3-4)
- ElixoSense order flow
- Real-world testing
- Iteration

### Phase 4: The Builder (Week 5+)
- Visual workflow builder UI
- Workflow templates
- Client self-service

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Actions in registry | 20+ |
| Workflows definable in YAML | Any combination |
| Temporal execution | Durable, retriable |
| Expression evaluation | Safe, deterministic |
| Tenant isolation | RLS enforced |

---

## References

- [Temporal.io Documentation](https://docs.temporal.io/)
- [CNCF Serverless Workflow](https://serverlessworkflow.io/)
- [JSONata Expression Language](https://jsonata.org/)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)

---

**This architecture transforms KCOS from a product into a platform - the universal connective tissue for Kenyan commerce.**
