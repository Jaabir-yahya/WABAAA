# KCOS Implementation Plan

**Date**: January 17, 2026  
**Status**: READY TO EXECUTE  
**Timeline**: 6 weeks

---

## Executive Summary

This plan implements the KCOS Lego Architecture - a composable system where atomic Actions are wired into Workflows. We use Temporal.io for durable execution and JSONata for expression evaluation.

---

## Implementation Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    6-WEEK IMPLEMENTATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WEEK 1-2: THE LANGUAGE                                         │
│  ├─ Action interface & registry                                 │
│  ├─ 10 core actions                                             │
│  ├─ Expression evaluator (JSONata)                              │
│  └─ Idempotency system                                          │
│                                                                  │
│  WEEK 2-3: THE INTERPRETER                                      │
│  ├─ Workflow definition format                                  │
│  ├─ Temporal.io integration                                     │
│  └─ Workflow engine                                             │
│                                                                  │
│  WEEK 3-4: FIRST CLIENT WORKFLOW                                │
│  ├─ ElixoSense order flow                                       │
│  ├─ Real-world testing                                          │
│  └─ Iteration                                                   │
│                                                                  │
│  WEEK 5-6: BUILDER & POLISH                                     │
│  ├─ Visual workflow builder UI                                  │
│  ├─ More actions (20+ total)                                    │
│  └─ Documentation & templates                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: The Language (Week 1-2)

### Goal
Create the atomic building blocks that all workflows use.

### Deliverables

#### 1.1 Action System Core

**Files to create:**

```
packages/
  core/
    actions/
      types.ts              # Action interfaces
      registry.ts           # ActionRegistry class
      context.ts            # ActionContext utilities
      index.ts              # Exports
```

**`types.ts`** - Core interfaces:
```typescript
export interface Action {
  id: string;
  category: ActionCategory;
  description: string;
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  retryable: boolean;
  idempotent: boolean;
  execute(input: ActionInput, context: ActionContext): Promise<ActionOutput>;
  compensate?(input: ActionInput, context: ActionContext): Promise<void>;
}

export interface ActionContext {
  tenantId: string;
  workflowId: string;
  correlationId: string;
  variables: Record<string, any>;
  idempotencyKey: string;
  stepId: string;
}

export interface ActionOutput {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
}
```

**`registry.ts`** - Action registry:
```typescript
export class ActionRegistry {
  private actions = new Map<string, Action>();
  
  register(action: Action): void;
  get(id: string): Action | undefined;
  list(): ActionMetadata[];
  listByCategory(category: string): ActionMetadata[];
}

export const actionRegistry = new ActionRegistry();
```

#### 1.2 Idempotency System

**Files to create:**

```
packages/
  core/
    idempotency/
      types.ts
      client.ts
      index.ts

packages/
  database/
    migrations/
      0015_idempotency_keys.sql
```

**Migration:**
```sql
CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response JSONB NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE(tenant_id, idempotency_key, operation_type)
);
```

**Client:**
```typescript
export async function withIdempotency<T>(
  tenantId: string,
  key: string,
  operation: string,
  payload: any,
  fn: () => Promise<T>
): Promise<{ isNew: boolean; result: T }>;
```

#### 1.3 Expression Evaluator

**Files to create:**

```
packages/
  core/
    expressions/
      evaluator.ts
      functions.ts    # Custom functions ($now, $uuid, etc.)
      index.ts
```

**Evaluator using JSONata:**
```typescript
import jsonata from 'jsonata';

export function evaluate(expression: string, context: Record<string, any>): any {
  // Add custom functions
  const expr = jsonata(expression);
  expr.registerFunction('now', () => new Date().toISOString());
  expr.registerFunction('uuid', () => crypto.randomUUID());
  
  return expr.evaluate(context);
}

export function resolveInputs(
  input: Record<string, any>,
  context: Record<string, any>
): Record<string, any>;
```

#### 1.4 Core Actions (10 Initial)

**Files to create:**

```
packages/
  core/
    actions/
      communication/
        whatsapp-send.ts
        sms-send.ts
      payment/
        mpesa-initiate.ts
        payment-record.ts
      identity/
        actor-resolve.ts
      data/
        order-create.ts
        event-log.ts
      document/
        document-parse.ts
      qr/
        qr-generate.ts
      control/
        condition-if.ts
```

**Implementation priority:**

| Action | Priority | Depends On |
|--------|----------|------------|
| `event.log` | P0 | Nothing (simplest) |
| `condition.if` | P0 | Expression evaluator |
| `actor.resolve` | P0 | Database |
| `order.create` | P1 | actor.resolve |
| `whatsapp.send` | P1 | Existing adapter |
| `mpesa.initiate` | P1 | Existing adapter |
| `sms.send` | P1 | Existing adapter |
| `document.parse` | P2 | Existing parser |
| `qr.generate` | P2 | Existing function |
| `payment.record` | P2 | order.create |

---

## Phase 2: The Interpreter (Week 2-3)

### Goal
Build the engine that executes workflow definitions.

### Deliverables

#### 2.1 Workflow Definition Types

**Files to create:**

```
packages/
  core/
    workflows/
      types.ts           # WorkflowDefinition, WorkflowStep, etc.
      loader.ts          # Load from DB/YAML
      validator.ts       # Validate definitions
      index.ts
```

#### 2.2 Temporal.io Integration

**Files to create:**

```
packages/
  temporal/
    client.ts            # Temporal client setup
    worker.ts            # Temporal worker
    workflows/
      execute-workflow.ts  # Main workflow function
    activities/
      execute-action.ts    # Action executor activity
    index.ts

# Temporal deployment
docker/
  temporal/
    docker-compose.yml   # Local Temporal for dev
```

**Worker setup:**
```typescript
import { Worker } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const worker = await Worker.create({
    taskQueue: 'kcos-main',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });
  await worker.run();
}
```

**Main workflow:**
```typescript
import { proxyActivities } from '@temporalio/workflow';

export async function executeWorkflowDefinition(
  definition: WorkflowDefinition,
  triggerEvent: TriggerEvent
): Promise<WorkflowResult> {
  const context = initializeContext(definition, triggerEvent);
  
  for (const step of definition.steps) {
    await executeStep(step, context);
  }
  
  return { status: 'completed', variables: context.variables };
}
```

#### 2.3 Workflow Engine

**Files to create:**

```
packages/
  core/
    workflows/
      engine.ts          # WorkflowEngine class
      step-executor.ts   # Step execution logic
      compensation.ts    # Saga compensation
```

**Engine:**
```typescript
export class WorkflowEngine {
  constructor(
    private temporalClient: TemporalClient,
    private actionRegistry: ActionRegistry
  ) {}
  
  async start(
    definition: WorkflowDefinition,
    trigger: TriggerEvent,
    tenantId: string
  ): Promise<WorkflowHandle>;
  
  async signal(
    workflowId: string,
    signalName: string,
    data: any
  ): Promise<void>;
  
  async query(
    workflowId: string,
    queryName: string
  ): Promise<any>;
}
```

#### 2.4 Database Schema

**Files to create:**

```
packages/
  database/
    migrations/
      0016_workflow_definitions.sql
      0017_workflow_instances.sql
      0018_workflow_events.sql
```

---

## Phase 3: First Client Workflow (Week 3-4)

### Goal
Validate the system with a real workflow for ElixoSense.

### Deliverables

#### 3.1 ElixoSense Order Workflow

**Files to create:**

```
workflows/
  elixosense/
    order-flow.yaml      # Main order workflow
    payment-reminder.yaml
    daily-summary.yaml
```

**order-flow.yaml:**
```yaml
id: elixosense-order
name: ElixoSense WhatsApp Order
trigger:
  type: whatsapp.received
steps:
  - id: resolve_customer
    action: actor.resolve
    input:
      phone: "{{ trigger.data.from }}"
    output: customer
  # ... rest of workflow
```

#### 3.2 Integration with Existing System

**Refactor existing Edge Functions to use workflows:**

| Function | Refactor To |
|----------|-------------|
| `whatsapp-webhook` | Trigger router → starts workflow |
| `mpesa-callback` | Trigger router → signals workflow |
| `generate-payment-link` | Uses `mpesa.initiate` action |
| `send-reminders` | Workflow: `payment-reminder.yaml` |
| `daily-summary` | Workflow: `daily-summary.yaml` |

#### 3.3 Testing

**Files to create:**

```
packages/
  core/
    actions/
      __tests__/
        whatsapp-send.test.ts
        mpesa-initiate.test.ts
        # ... all actions

packages/
  core/
    workflows/
      __tests__/
        engine.test.ts
        step-executor.test.ts
```

---

## Phase 4: Builder & Polish (Week 5-6)

### Goal
Enable clients to create their own workflows.

### Deliverables

#### 4.1 Visual Workflow Builder

**Files to create:**

```
apps/
  merchant-svelte/
    src/
      routes/
        workflows/
          +page.svelte           # List workflows
          [id]/
            +page.svelte         # View workflow
          builder/
            +page.svelte         # Visual builder
      lib/
        components/
          WorkflowBuilder.svelte
          ActionPalette.svelte
          StepEditor.svelte
          ExpressionInput.svelte
```

#### 4.2 Additional Actions

Implement remaining actions to reach 20+:

| Action | Category |
|--------|----------|
| `notification.push` | communication |
| `mpesa.verify` | payment |
| `actor.create` | identity |
| `actor.update` | identity |
| `order.update` | data |
| `order.cancel` | data |
| `qr.decode` | qr |
| `qr.track` | qr |
| `wait.for` | control |
| `loop.each` | control |
| `parallel.all` | control |
| `webhook.call` | integration |

#### 4.3 Workflow Templates

**Files to create:**

```
workflows/
  templates/
    retail-order.yaml
    restaurant-order.yaml
    warehouse-access.yaml
    payment-reminder.yaml
    daily-summary.yaml
    document-processing.yaml
```

---

## Technical Decisions

### Why Temporal.io?

| Concern | Temporal Solution |
|---------|------------------|
| Durability | Workflows survive crashes, restarts |
| Retries | Built-in retry policies with backoff |
| Timeouts | Activity and workflow timeouts |
| Signals | Wait for external events (M-Pesa callback) |
| Queries | Check workflow state without affecting it |
| Versioning | Workflow versioning for updates |
| Observability | Built-in UI, metrics, tracing |

### Why JSONata?

| Concern | JSONata Solution |
|---------|-----------------|
| Safety | No arbitrary code execution |
| Determinism | Same input = same output |
| Power | Rich query/transform language |
| Familiarity | JSON-native syntax |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Supabase (Managed)                                         │
│  ├─ PostgreSQL (Event Store, Workflows, Actions)            │
│  ├─ Edge Functions (Webhook Router, API)                    │
│  └─ Auth, Storage, Realtime                                 │
│                                                              │
│  Temporal Cloud ($200/mo) OR Self-hosted                    │
│  ├─ Temporal Server                                         │
│  ├─ Temporal Web UI                                         │
│  └─ Workflow History                                        │
│                                                              │
│  Fly.io / Railway                                           │
│  └─ Temporal Worker (Node.js)                               │
│                                                              │
│  Vercel                                                      │
│  └─ Merchant Dashboard (Svelte)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Immediate Next Steps

### Today: Proof of Concept

```bash
# 1. Create action system skeleton
mkdir -p packages/core/actions
touch packages/core/actions/types.ts
touch packages/core/actions/registry.ts

# 2. Implement two simple actions
touch packages/core/actions/debug/log.ts      # Logs message
touch packages/core/actions/http/get.ts       # HTTP GET request

# 3. Create simple workflow definition
touch workflows/test/hello-world.yaml

# 4. Write minimal engine (for loop)
touch packages/core/workflows/simple-engine.ts

# 5. Run it!
npx ts-node packages/core/workflows/simple-engine.ts
```

### Tomorrow: Temporal Integration

```bash
# 1. Install Temporal
npm install @temporalio/client @temporalio/worker @temporalio/workflow

# 2. Start local Temporal (Docker)
docker-compose -f docker/temporal/docker-compose.yml up -d

# 3. Create Temporal worker
touch packages/temporal/worker.ts

# 4. Move engine to Temporal workflow
touch packages/temporal/workflows/execute-workflow.ts

# 5. Run worker + test
npm run temporal:worker
```

### This Week: Real Actions

1. `whatsapp.send` - Wrap existing WhatsApp adapter
2. `mpesa.initiate` - Wrap existing M-Pesa adapter  
3. `order.create` - Wrap existing order logic
4. `event.log` - Log to event store
5. `actor.resolve` - Find/create actors

---

## Success Metrics

| Metric | Week 2 | Week 4 | Week 6 |
|--------|--------|--------|--------|
| Actions in registry | 10 | 15 | 20+ |
| Workflows defined | 1 | 3 | 10+ |
| ElixoSense live | No | Yes | Yes |
| Builder UI | No | No | Yes |
| Test coverage | 50% | 70% | 80% |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Temporal complexity | Start with simple for-loop engine, migrate to Temporal |
| Expression security | Use JSONata (safe by design) |
| Action failures | Idempotency + compensation |
| Scope creep | Focus on ElixoSense workflow first |

---

**This plan transforms KCOS from a set of functions into a programmable commerce platform.**
