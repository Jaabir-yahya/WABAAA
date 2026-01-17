# KCOS Documentation Index

**Kenya Commerce OS - Complete Documentation**

**Last Updated**: January 17, 2026  
**Status**: Ready for Implementation

---

## Quick Navigation

| Want to... | Read this |
|------------|-----------|
| Start building TODAY | [KCOS-QUICK-START.md](KCOS-QUICK-START.md) |
| Understand the architecture | [KCOS-LEGO-ARCHITECTURE.md](KCOS-LEGO-ARCHITECTURE.md) |
| Understand commerce primitives | [KCOS-COMMERCE-PRIMITIVES.md](KCOS-COMMERCE-PRIMITIVES.md) |
| Create a new Action | [KCOS-ACTION-SPECIFICATION.md](KCOS-ACTION-SPECIFICATION.md) |
| Define a Workflow | [KCOS-WORKFLOW-SPECIFICATION.md](KCOS-WORKFLOW-SPECIFICATION.md) |
| See the full implementation plan | [KCOS-IMPLEMENTATION-PLAN.md](KCOS-IMPLEMENTATION-PLAN.md) |
| Understand the research behind it | [KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md](KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md) |
| Copy workflows from big companies | [KCOS-INDUSTRY-WORKFLOW-GUIDE.md](KCOS-INDUSTRY-WORKFLOW-GUIDE.md) |
| Check architecture validation | [KCOS-ARCHITECTURE-VALIDATION.md](KCOS-ARCHITECTURE-VALIDATION.md) |

---

## Documentation Structure

```
docs/
├── KCOS-DOCUMENTATION-INDEX.md      ← YOU ARE HERE
│
├── GETTING STARTED
│   └── KCOS-QUICK-START.md          # 3-day hands-on guide
│
├── ARCHITECTURE
│   ├── KCOS-LEGO-ARCHITECTURE.md    # Core philosophy & system design
│   └── KCOS-ARCHITECTURE-VALIDATION.md  # Research validation & refinements
│
├── PRIMITIVES
│   └── KCOS-COMMERCE-PRIMITIVES.md  # Universal commerce primitives & patterns
│
├── SPECIFICATIONS
│   ├── KCOS-ACTION-SPECIFICATION.md # Action interface & 20+ action definitions
│   └── KCOS-WORKFLOW-SPECIFICATION.md  # Workflow format & examples
│
├── IMPLEMENTATION
│   ├── KCOS-IMPLEMENTATION-PLAN.md  # 6-week phased plan
│   └── KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md  # Industry patterns & Kenya adaptations
│
└── REFERENCE
    └── KCOS-INDUSTRY-WORKFLOW-GUIDE.md  # Shopify, Stripe, Amazon, DoorDash patterns
```

---

## Reading Order

### For Understanding (2-3 hours total)

1. **[KCOS-LEGO-ARCHITECTURE.md](KCOS-LEGO-ARCHITECTURE.md)** (30 min)
   - The "Lego blocks" mental model
   - Why this architecture works
   - How Actions, Workflows, and Engine fit together

2. **[KCOS-COMMERCE-PRIMITIVES.md](KCOS-COMMERCE-PRIMITIVES.md)** (30 min)
   - Universal commerce primitives
   - Capability matrix (WhatsApp, QR, M-Pesa, SMS)
   - Pattern workflows and industry configuration

3. **[KCOS-ARCHITECTURE-VALIDATION.md](KCOS-ARCHITECTURE-VALIDATION.md)** (30 min)
   - Research validation against industry standards
   - Critical refinements (idempotency, event ordering, retry policies)
   - Comparison to Netflix, Amazon, Stripe patterns

4. **[KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md](KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md)** (45 min)
   - Industry validation (Temporal, n8n, Step Functions)
   - Kenya-specific considerations (M-Pesa, WhatsApp, reliability)
   - Technology stack decisions

### For Building (reference as needed)

5. **[KCOS-ACTION-SPECIFICATION.md](KCOS-ACTION-SPECIFICATION.md)** (45 min)
   - Complete Action interface
   - 20+ action definitions with schemas
   - How to create new actions

6. **[KCOS-WORKFLOW-SPECIFICATION.md](KCOS-WORKFLOW-SPECIFICATION.md)** (45 min)
   - Workflow definition format (YAML)
   - Triggers, steps, error handling
   - 4 complete workflow examples

7. **[KCOS-INDUSTRY-WORKFLOW-GUIDE.md](KCOS-INDUSTRY-WORKFLOW-GUIDE.md)** (60 min)
   - Shopify fulfillment workflow
   - Stripe payment automation
   - Amazon inventory management
   - DoorDash delivery orchestration
   - Uber dispatch pattern

### For Executing

8. **[KCOS-IMPLEMENTATION-PLAN.md](KCOS-IMPLEMENTATION-PLAN.md)** (30 min)
   - 6-week phased timeline
   - Week-by-week deliverables
   - Files to create first

9. **[KCOS-QUICK-START.md](KCOS-QUICK-START.md)** (15 min)
   - Day 1: Build two actions
   - Day 2: Build simple engine
   - Day 3: Add real actions

---

## Key Concepts Glossary

| Term | Definition | Doc Reference |
|------|------------|---------------|
| **Action** | Atomic operation (whatsapp.send, mpesa.initiate) | [Action Spec](KCOS-ACTION-SPECIFICATION.md) |
| **Workflow** | Sequence of actions wired together | [Workflow Spec](KCOS-WORKFLOW-SPECIFICATION.md) |
| **Trigger** | Event that starts a workflow | [Workflow Spec](KCOS-WORKFLOW-SPECIFICATION.md#triggers) |
| **ActionRegistry** | Catalog of all available actions | [Architecture](KCOS-LEGO-ARCHITECTURE.md) |
| **WorkflowEngine** | Executes workflow definitions | [Architecture](KCOS-LEGO-ARCHITECTURE.md) |
| **Compensation** | Undo action if later step fails (Saga pattern) | [Validation](KCOS-ARCHITECTURE-VALIDATION.md) |
| **Idempotency** | Safe to retry without duplicates | [Validation](KCOS-ARCHITECTURE-VALIDATION.md) |
| **JSONata** | Expression language for data flow | [Research Guide](KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md) |
| **Temporal.io** | Durable workflow execution engine | [Research Guide](KCOS-RESEARCH-IMPLEMENTATION-GUIDE.md) |

---

## Action Categories (Current: 12 Actions Built)

| Category | Actions | Purpose |
|----------|---------|---------|
| **communication** | whatsapp.send | Send messages |
| **payment** | mpesa.initiate, mpesa.verify | Handle money |
| **identity** | actor.resolve | Manage participants |
| **data** | order.create, event.log | Store information |
| **document** | data.transform | Process mappings |
| **integration** | http.request | External systems |
| **qr** | qr.generate, qr.decode | QR code operations |
| **control** | condition.if | Flow control |
| **debug** | debug.log | Logging and diagnostics |

See [KCOS-ACTION-SPECIFICATION.md](KCOS-ACTION-SPECIFICATION.md) for the full action catalogue and planned additions.

---

## Workflow Examples (Current)

| Workflow | Industry Pattern | Doc Reference |
|----------|-----------------|---------------|
| ElixoSense Order Flow | Custom | `workflows/elixosense/order-flow.yaml` |
| Mini Supermarket Order | Shopify | [Workflow Spec](KCOS-WORKFLOW-SPECIFICATION.md) |
| Payment Reminder Escalation | Stripe | [Workflow Spec](KCOS-WORKFLOW-SPECIFICATION.md) |
| Shopify-Style Fulfillment | Shopify | [Industry Guide](KCOS-INDUSTRY-WORKFLOW-GUIDE.md) |
| Stripe Payment Automation | Stripe | [Industry Guide](KCOS-INDUSTRY-WORKFLOW-GUIDE.md) |

---

## Implementation Timeline (Reference)

| Week | Focus | Key Deliverable |
|------|-------|-----------------|
| **1-2** | The Language | Action interface, registry, 10 core actions |
| **2-3** | The Interpreter | Workflow engine with Temporal.io |
| **3-4** | First Client | ElixoSense order workflow live |
| **5-6** | Builder & Polish | Visual workflow builder, 20+ actions |

See [KCOS-IMPLEMENTATION-PLAN.md](KCOS-IMPLEMENTATION-PLAN.md) for detailed breakdown.

---

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Language** | TypeScript | Type safety, async I/O, Kenyan dev community |
| **Workflow Engine** | Temporal.io | Durability, retry, state recovery |
| **Expressions** | JSONata | Safe, deterministic, powerful |
| **Database** | PostgreSQL (Supabase) | Event store, RLS, managed |
| **Cache** | Redis | Idempotency keys, distributed locks |
| **Frontend** | Svelte | Existing merchant dashboard |

---

## Core Files (Already Built)

```
packages/
  core/
    actions/
      types.ts           # Action interface
      registry.ts        # ActionRegistry
      builtin/           # Built-in + Kenya actions
    workflows/
      types.ts           # WorkflowDefinition
      engine.ts          # WorkflowEngine
      step-executor.ts   # Step execution
    expressions/
      evaluator.ts       # JSONata wrapper
    idempotency/
      client.ts          # withIdempotency()
  api/
    server.ts            # Minimal HTTP API server

workflows/
  elixosense/
    order-flow.yaml      # First real workflow
```

---

## Success Metrics (Current Snapshot)

| Metric | Current | Target |
|--------|---------|--------|
| Actions in registry | 12 | 20+ |
| Workflows defined | 1 | 10+ |
| ElixoSense workflow | Drafted | Live |
| Builder UI | Not started | Planned |

---

## External References

- [Temporal.io Documentation](https://docs.temporal.io/)
- [JSONata Expression Language](https://jsonata.org/)
- [CNCF Serverless Workflow](https://serverlessworkflow.io/)
- [M-Pesa Daraja API](https://developer.safaricom.co.ke/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

**Start here: [KCOS-QUICK-START.md](KCOS-QUICK-START.md)**

**The foundation is solid. Time to build.**
