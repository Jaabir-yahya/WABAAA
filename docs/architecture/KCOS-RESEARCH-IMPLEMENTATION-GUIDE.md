# KCOS Implementation Research & Build Guide

**Date**: January 17, 2026  
**Project**: Kenya Commerce OS (Lego Architecture)  
**Status**: Ready for Implementation

---

## RESEARCH FINDINGS

### 1. Industry Validation

Your architecture aligns perfectly with proven production patterns:

#### Temporal.io - Your North Star

- **Status**: Production-ready, used at scale
- **Key Insight**: Workflows + Activities (= Your Workflows + Actions)
- **Architecture Match**: 
  - Workflow = Business Logic (declarative)
  - Activity = Resilient Operations (execution)
  - Task Queue = Routing to Workers
  - History = State Recovery
- **Advantage for Kenya**: Temporal handles crash recovery automatically via event replay
- **Reference**: [Workflow Engine Principles](https://temporal.io/blog/workflow-engine-principles)

#### Zapier/n8n - UI/UX Reference

- **Pattern**: Trigger → Actions → Conditions → Flow
- **n8n Advantage**: Open-source, self-hostable (better for Kenya)
- **Key Features to Copy**:
  - Step-by-step visual builder
  - Output mapping between steps
  - Conditional branches
  - Error handling paths
- **Reference**: [n8n vs Zapier](https://www.activepieces.com/blog/n8n-vs-zapier)

#### AWS Step Functions - Serverless Patterns

- **Pattern**: State machines with resilient retry logic
- **Best Practices**:
  - Cost optimization through state machine design
  - Distributed Map for parallel processing
  - Nested workflows for modularity
  - Built-in error handling
- **Key Learnings**:
  - Use standard workflows (not express) for Kenya use cases (durability > speed)
  - Implement callback patterns for long-running operations (M-Pesa callbacks, WhatsApp delivery)
- **Reference**: [AWS Step Functions Patterns](https://aws.amazon.com/awstv/watch/494f68011a4/)

---

## 2. Architecture Deep Dive

### Your Lego System vs Industry Standards

```
┌────────────────────────────────────────────────────────┐
│ KCOS LAYER COMPARISON                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│ YOUR ARCHITECTURE     ↔   INDUSTRY EQUIVALENT         │
│ ─────────────────────     ──────────────────────      │
│                                                        │
│ Actions               ↔   Activities (Temporal)       │
│                       ↔   Action Nodes (n8n/Zapier)   │
│                       ↔   Tasks (Step Functions)      │
│                                                        │
│ Workflows            ↔   Workflow Definition          │
│                       ↔   State Machine (Step Fn)     │
│                       ↔   Zap/Workflow (n8n/Zapier)   │
│                                                        │
│ ActionRegistry       ↔   Action Catalog               │
│                                                        │
│ TemporalWorkflowEngine ↔ Temporal Service + Workers   │
│                                                        │
│ Expression Language  ↔   JSONata (n8n) / JMESPath     │
│ ({{ }} syntax)            (AWS Step Functions)        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Your Implementation is Sound Because:

1. **Deterministic Workflows**: Fixed sequence = easy to debug
2. **Resilient Activities**: Each action can retry independently
3. **State Recovery**: Event history enables replay on failure
4. **No Prescriptive Workflows**: Clients define their own (infinite combinations)

---

## 3. Critical Implementation Decisions for Kenya

### A. Expression Language: JSONata Over JMESPath

**Why JSONata?**

```typescript
// Your plan uses: {{ expression }}
// JSONata is perfect for this

// WORKS IN JSONATA
{{ trigger.data.phone }}                          // String interpolation
{{ steps.parse.output.total * 1.16 }}            // Math
{{ trigger.data.items[*].price }}                // Array flattening
{{ $sum(trigger.data.items[*].price) }}          // Aggregation
{{ trigger.data.timestamp > $now() - 3600000 }}  // Date math

// Better than JMESPath because:
// - More powerful expression syntax
// - Better for non-programmer users
// - Handles M-Pesa calculations easily
```

**Implementation**:

```typescript
import jsonata from 'jsonata';

class ExpressionResolver {
  resolve(template: string, context: Record<string, any>): any {
    // Match {{ ... }} patterns
    const pattern = /\{\{(.*?)\}\}/g;
    
    return template.replace(pattern, (match, expr) => {
      try {
        const expression = jsonata(expr);
        return expression.evaluate(context);
      } catch (error) {
        throw new Error(`Expression error in ${match}: ${error.message}`);
      }
    });
  }
}
```

### B. Action Idempotency - Critical for Kenya Context

**Why?** WhatsApp might retry, M-Pesa callbacks might duplicate, network failures are common.

```typescript
interface Action {
  id: string;
  
  // CRITICAL FOR KENYA
  idempotent: boolean;  // Can safely run multiple times?
  idempotencyKey?: string; // Unique identifier for deduplication
  
  // Implementation
  execute(input: ActionInput, context: ActionContext): Promise<ActionOutput>;
}

// EXAMPLES FOR KENYA:

// IDEMPOTENT (safe to retry)
class WhatsAppSendAction implements Action {
  idempotent = true;  // Sending same message twice = idempotent
  
  async execute(input: ActionInput, context: ActionContext) {
    // Use phone + timestamp as key
    const key = `${input.to}_${input.messageId}`;
    
    // Check if already sent
    const cached = await context.cache.get(key);
    if (cached) return cached;  // Return previous result
    
    // Send message
    const result = await whatsapp.send(input);
    
    // Cache for 24 hours
    await context.cache.set(key, result, 86400);
    return result;
  }
}

// NOT IDEMPOTENT (dangerous to retry)
class MPesaInitiateAction implements Action {
  idempotent = false;  // Initiating payment twice = double charge!
  
  async execute(input: ActionInput, context: ActionContext) {
    // Use CheckoutRequestID to prevent duplicates
    const id = input.idempotencyKey || generateId();
    
    // M-Pesa API call (single attempt only)
    return await mpesa.initiate({ 
      ...input, 
      id: id  // M-Pesa deduplicates on this
    });
  }
}
```

### C. Compensation (Saga Pattern) - Crucial for Multi-Step Transactions

**The Problem**: 
1. Create Order ✓
2. Charge M-Pesa ✓  
3. Update Inventory ✗ (fails)
→ Now customer paid but inventory never updated!

**The Solution - Compensation**:

```yaml
steps:
  - id: create_order
    action: order.create
    input:
      items: "{{ parsed.items }}"
    compensation: order.cancel  # If later steps fail, run this
    
  - id: charge_mpesa
    action: mpesa.initiate
    input:
      phone: "{{ trigger.data.from }}"
      amount: "{{ order.total }}"
    compensation: mpesa.refund  # Refund if inventory fails
    
  - id: update_inventory
    action: inventory.decrement
    input:
      items: "{{ order.items }}"
    # No compensation for last step (it's the end)
```

**Temporal Integration** (handles automatically):

```typescript
class TemporalWorkflowExecutor {
  async execute(workflow: WorkflowDefinition, trigger: TriggerEvent) {
    const completedSteps = [];
    
    try {
      for (const step of workflow.steps) {
        const result = await this.executeAction(step);
        completedSteps.push({ step, result });
      }
    } catch (error) {
      // Compensation flow: run in reverse
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const { step } = completedSteps[i];
        if (step.compensation) {
          await this.executeAction({
            action: step.compensation,
            input: /* original input */
          });
        }
      }
      throw error;
    }
  }
}
```

---

## 4. Implementation Roadmap (Phase-Based)

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Temporal server (self-hosted or Cloud)
- [ ] Implement Action interface & ActionRegistry
- [ ] Create expression resolver (JSONata)
- [ ] Build workflow parser (YAML → JSON)

**Deliverable**: Hello World workflow (WhatsApp.receive → log.event)

### Phase 2: Kenya Payment Core (Week 3-4)

- [ ] Implement M-Pesa actions (initiate, verify, callback)
- [ ] Add idempotency layer with Redis
- [ ] Build actor resolution (phone → business)
- [ ] Implement order.create action

**Deliverable**: Complete "Mini Supermarket Order" workflow

### Phase 3: Multi-Channel (Week 5-6)

- [ ] WhatsApp.send, WhatsApp.receive
- [ ] SMS.send action
- [ ] QR.generate, QR.decode
- [ ] Document.parse (receipts, images)

**Deliverable**: 3 different workflow patterns working

### Phase 4: Engine & UI (Week 7-8)

- [ ] Temporal Worker pool management
- [ ] Workflow orchestrator service
- [ ] Basic UI for workflow building
- [ ] Monitoring/debugging dashboard

**Deliverable**: Self-service workflow creation

### Phase 5: Data Ingestion (Week 9-10)

- [ ] Extension architecture for custom data
- [ ] Webhook receiver for external systems
- [ ] Event streaming (Kafka/Redis)
- [ ] Historical data loader

**Deliverable**: Live data flowing through workflows

---

## 5. Foreign Implementations to Reference

### A. Comparison Chart

| System | Architecture | Language | Open Source | Kenya Fit |
|--------|-------------|----------|-----------|-----------|
| **Temporal.io** | Event-sourced + State machine | Go/TypeScript | Yes | 95% |
| **n8n** | Visual workflow builder | Node.js | Yes | 85% |
| **Apache Airflow** | DAG-based scheduler | Python | Yes | 60% |
| **AWS Step Functions** | Cloud state machine | JSON/YAML | No (AWS-only) | 70% |
| **Zapier** | Cloud workflow automation | Proprietary | No | 50% |

**Recommendation**: Start with Temporal core, add n8n-style UI later

### B. Code Examples from Industry

#### Pattern 1: Event Sourcing (Temporal's approach)

```typescript
// Instead of storing current state, store events
interface WorkflowEvent {
  type: 'WorkflowStarted' | 'ActionCompleted' | 'ActionFailed';
  timestamp: Date;
  data: any;
}

class WorkflowHistory {
  events: WorkflowEvent[] = [];
  
  // Replay from history to recover state
  replay(workflow: WorkflowDefinition, upToEvent?: number): any {
    let state = {};
    
    for (let i = 0; i < (upToEvent ?? this.events.length); i++) {
      const event = this.events[i];
      
      if (event.type === 'ActionCompleted') {
        state[event.data.stepId] = event.data.output;
      } else if (event.type === 'ActionFailed') {
        // Re-throw to trigger compensation
      }
    }
    
    return state;
  }
}

// Kenya Benefit: If server crashes mid-workflow, just replay history
```

#### Pattern 2: Async Callbacks (for M-Pesa, WhatsApp)

```typescript
// M-Pesa doesn't respond immediately, sends callback later
// Solution: Wait state that pauses workflow

interface WaitAction {
  id: 'wait_for_mpesa_callback';
  type: 'wait';
  timeout: 300000; // 5 minutes
  expectedEvent: 'mpesa.callback';
}

// Workflow pauses at this step
// When M-Pesa calls webhook, it resumes
class CallbackReceiver {
  onMPesaCallback(data: any) {
    // Resume workflow with callback data
    this.workflowEngine.resume(workflowId, data);
  }
}
```

#### Pattern 3: Parallel Processing (for multi-channel notifications)

```yaml
# Send to WhatsApp AND SMS simultaneously
steps:
  - id: notify_customer
    type: parallel.all
    actions:
      - action: whatsapp.send
        input: { to: "{{ customer.phone }}" }
      - action: sms.send
        input: { to: "{{ customer.phone }}" }
      - action: email.send
        input: { to: "{{ customer.email }}" }
    
    # Wait for all to complete
    waitFor: all
    
    # Or continue if at least one succeeds
    # waitFor: any
```

---

## 6. Kenya-Specific Considerations

### A. Reliability in Unreliable Networks

```typescript
// Retry policy tuned for Kenya internet
const defaultRetryPolicy = {
  maxRetries: 5,
  initialDelay: 1000,      // Start at 1 second
  backoffMultiplier: 2,    // Exponential backoff
  maxDelay: 30000,         // Cap at 30 seconds
  jitter: true             // Add randomness to prevent thundering herd
};

// Example:
// Attempt 1: immediate
// Attempt 2: 1-2 seconds later
// Attempt 3: 2-4 seconds later
// Attempt 4: 4-8 seconds later
// Attempt 5: 8-16 seconds later
// Max attempt: 30 second wait
```

### B. M-Pesa Integration Pattern

```typescript
class MPesaAction implements Action {
  id = 'mpesa.initiate';
  
  async execute(input: {
    phone: string;        // '254712345678'
    amount: number;       // 500 (KSh)
    orderId: string;      // Order reference
  }, context: ActionContext) {
    
    // Step 1: Initiate (synchronous)
    const response = await mpesa.stk.push({
      phone: input.phone,
      amount: input.amount,
      businessShortCode: context.mpesaConfig.shortCode
    });
    
    // Step 2: Return early (STK push sent)
    return {
      checkoutRequestId: response.CheckoutRequestID,
      status: 'pending',
      pollingUrl: `${context.webhookUrl}/mpesa/status/${input.orderId}`
    };
    
    // Step 3: Customer enters PIN on their phone
    // Step 4: M-Pesa calls webhook
    // Step 5: Workflow resumes
  }
  
  // Verification (called by webhook callback)
  async verify(input: {
    checkoutRequestId: string;
  }): Promise<{ status: 'success' | 'failed' }> {
    const result = await mpesa.query(input.checkoutRequestId);
    return {
      status: result.ResultCode === 0 ? 'success' : 'failed'
    };
  }
}
```

### C. WhatsApp Business Integration

```typescript
// Two-way communication pattern

class WhatsAppReceiveAction implements Action {
  id = 'whatsapp.received';
  
  // This is a TRIGGER
  async watch(): AsyncIterator<WhatsAppMessage> {
    // Listen to incoming messages
    const ws = new WebSocket(this.webhookUrl);
    
    for await (const message of ws) {
      yield {
        from: message.from,
        text: message.text,
        mediaUrl: message.mediaUrl,
        timestamp: message.timestamp
      };
    }
  }
}

class WhatsAppSendAction implements Action {
  id = 'whatsapp.send';
  
  async execute(input: {
    to: string;           // '254712345678'
    message: string;      // 'Asante! Jumla: KSh 500'
    mediaUrl?: string;    // Optional image/PDF
  }) {
    const result = await whatsapp.send(input);
    
    return {
      messageId: result.messages.id,
      status: 'sent'
    };
  }
}
```

---

## 7. Technology Stack Recommendation

### Backend Core

```
Language: TypeScript (Node.js)
Reason: Async I/O perfect for M-Pesa callbacks, wide Kenyan dev community
```

### Workflow Engine

```
Primary: Temporal.io (self-hosted)
Backup: Bull + Redis (lighter alternative)
```

### Expression Language

```
JSONata (npm: jsonata)
Reason: Powerful, safe, perfect for non-programmers
```

### Data Storage

```
PostgreSQL: Workflow state, histories, audit logs
Redis: Idempotency keys, distributed locks, caching
S3/GCS: Media (receipts, QR codes)
```

### Message Queues

```
Primary: Temporal's built-in task queues
Secondary: Redis pub/sub for real-time updates
```

### Monitoring

```
Temporal UI (free, included)
DataDog or New Relic (optional, for production)
Custom dashboards: Next.js or Svelte
```

---

## 8. Code Structure

```
kcos/
├── packages/
│   ├── core/
│   │   ├── actions/
│   │   │   ├── communication/ (whatsapp, sms)
│   │   │   ├── payment/ (mpesa)
│   │   │   ├── data/ (order, event)
│   │   │   ├── integration/ (webhook)
│   │   │   └── control/ (conditions, loops)
│   │   ├── registry.ts (ActionRegistry)
│   │   ├── expression.ts (JSONata resolver)
│   │   ├── workflow.ts (WorkflowDefinition)
│   │   └── types.ts
│   │
│   ├── engine/
│   │   ├── temporal/
│   │   │   ├── workflows.ts (Temporal workflows)
│   │   │   └── activities.ts (Temporal activities)
│   │   ├── executor.ts (TemporalWorkflowEngine)
│   │   └── compensation.ts (Saga pattern)
│   │
│   ├── data/
│   │   ├── postgres/
│   │   │   ├── migrations/
│   │   │   └── queries.ts
│   │   └── redis/
│   │       └── idempotency.ts
│   │
│   └── api/
│       ├── triggers/ (webhooks)
│       ├── workflows/ (CRUD)
│       └── executions/ (history)
│
├── apps/
│   ├── server/ (Express/Fastify)
│   ├── ui/ (Svelte workflow builder)
│   └── worker/ (Temporal worker pool)
│
└── README.md
```

---

## 9. Quick Start: First Workflow

### Your Plan Says This Works:

```yaml
id: "client-a-order-flow"
trigger:
  type: whatsapp.received
steps:
  - id: parse_message
    action: document.parse
  - id: create_order
    action: order.create
  - id: charge_mpesa
    action: mpesa.initiate
  - id: send_confirmation
    action: whatsapp.send
```

### Implementation Reality Check:

1. WhatsApp trigger → Technical: Use WhatsApp Business API webhook
2. Parse message → Technical: NLP or regex (use existing NairobiChaosParser)
3. Create order → Technical: PostgreSQL insert
4. Charge M-Pesa → Technical: M-Pesa STK push + callback
5. Send confirmation → Technical: WhatsApp message send

**All achievable. Your plan is sound.**

---

## 10. Bringing Foreign Implementations to Kenya

### What Works:

- Temporal's resilience model (crashes common in Kenya)
- n8n's visual builder (non-technical users)
- M-Pesa callback pattern (standard here)
- WhatsApp two-way communication (common channel)

### What Needs Adaptation:

- AWS Step Functions → Use self-hosted Temporal instead (no AWS dependency)
- Zapier/n8n pricing model → Open-source instead (cost prohibitive)
- Complex expressions → Simplified for non-programmers
- Real-time guarantees → Tuned for eventual consistency

### Kenya Experience Layer:

```typescript
// Add Kenya-specific actions
const kenyaActions = [
  // M-Pesa specific
  'mpesa.initiate',
  'mpesa.verify',
  'mpesa.balance',
  
  // Local communication
  'whatsapp.send',
  'whatsapp.receive',
  'sms.send',
  'airtime.purchase',
  
  // Kenya business models
  'floatborrow.initiate',  // M-Pesa float borrowing
  'agent.register',        // Mobile money agent
  'shop.register',         // Mini supermarket
  
  // Local data
  'kyc.verify',            // ID verification
  'business.register',     // Business license
];
```

---

## 11. Data Ingestion Architecture (Phase 5)

```
┌─────────────────────────────────────────────────────────┐
│ DATA SOURCES (Future)                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Browser Extension ──┐                                  │
│ Mobile App ─────────├─→ [Webhook Receiver] ──┐        │
│ ERP System ─────────┤                         │        │
│ Bank API ───────────┤                         ├──→ [Kafka] ──┐
│ Government Data ────┤                         │              │
│ External APIs ──────┤                    [Event Store]       │
│                     │                                   │     │
│ CSV Upload ─────────┘                         ↓        │     │
│                                           [Deduplicator]     │
│                                                        │     │
└─────────────────────────────────────────────────────────┘
                                                          ↓
                                                    [Workflows Use Data]
                                                          ↑
                                                    PostgreSQL
                                                    Redis Cache
```

**Example: Extension to collect shop transaction data**

```typescript
// Extension on shop laptop/phone monitors:
// - Receipt printing
// - Inventory changes
// - Customer interactions

class DataCollectorExtension {
  async captureEvent(event: ShopEvent) {
    // Send to KCOS
    await fetch('https://kcos.api/ingest', {
      method: 'POST',
      body: JSON.stringify({
        source: 'pos_extension',
        type: 'transaction',
        data: event,
        timestamp: Date.now()
      })
    });
  }
}
```

---

## Summary: Your Path Forward

| Step | What | Why | Timeline |
|------|------|-----|----------|
| 1 | Set up Temporal | Durability + state recovery | Week 1 |
| 2 | Build Action system | Compose workflows | Week 2 |
| 3 | Implement M-Pesa | Core Kenya revenue | Week 3 |
| 4 | Add WhatsApp | Primary communication channel | Week 3 |
| 5 | Build workflow UI | Non-technical users | Week 4 |
| 6 | Launch MVP | Real customers, real data | Week 5 |
| 7 | Data ingestion | Live data from field | Week 6-10 |

---

## Key Files to Create First

1. `packages/core/actions/types.ts` - The core abstraction
2. `packages/core/actions/registry.ts` - The catalog
3. `packages/core/expressions/evaluator.ts` - JSONata wrapper
4. `packages/temporal/executor.ts` - Orchestrator
5. `packages/core/actions/communication/whatsapp-send.ts` - First action
6. `packages/core/actions/payment/mpesa-initiate.ts` - Payment action

Then test with the "Mini Supermarket Order" workflow.

---

**You're building the right thing. The architecture is sound. Execute with confidence.**
