# 🇰🇪 Kenya Commerce OS (KCOS)

**Composable Commerce Platform for Kenyan Businesses**

---

## Quick Links

| I want to... | Go to |
|--------------|-------|
| **Understand the system** | [[architecture/KCOS-LEGO-ARCHITECTURE]] |
| **Start building** | [[architecture/KCOS-QUICK-START]] |
| **Create an action** | [[architecture/KCOS-ACTION-SPECIFICATION]] |
| **Define a workflow** | [[architecture/KCOS-WORKFLOW-SPECIFICATION]] |
| **View diagrams** | [[diagrams/00-README]] |
| **Check the roadmap** | [[architecture/ROADMAP]] |

---

## Documentation Structure

```
docs/
├── HOME.md                 ← You are here
├── CONTEXT.md              # Project context & overview
│
├── architecture/           # Core KCOS documentation
│   ├── KCOS-LEGO-ARCHITECTURE.md
│   ├── KCOS-ACTION-SPECIFICATION.md
│   ├── KCOS-WORKFLOW-SPECIFICATION.md
│   ├── KCOS-QUICK-START.md
│   └── ...more
│
├── diagrams/               # Mermaid UML diagrams
│   ├── 00-README.md
│   ├── 01-system-architecture.md
│   └── ...10 diagrams
│
├── integrations/           # External system integrations
│   ├── MPESA.md
│   ├── WHATSAPP.md
│   └── SMS.md
│
├── flows/                  # Business-specific flows
│   ├── MINI_SUPERMARKET_FLOW.md
│   ├── RESTAURANT_FLOW.md
│   └── MULTI_TENANT_FLOW.md
│
├── database/               # Database documentation
│   └── SCHEMA.md
│
├── state-machines/         # State machine definitions
│   ├── ORDER_STATES.md
│   └── PAYMENT_STATES.md
│
├── adr/                    # Architecture Decision Records
│   └── 0001-0005...
│
├── clients/                # Client-specific documentation
│   └── ELIXOSENSE.md
│
├── reference/              # Legal & reference docs
│   ├── DATA-PROMISE.md
│   ├── MERCHANT-AGREEMENT.md
│   └── ...
│
└── archive/                # Historical/deprecated docs
```

---

## The KCOS Model

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW (YAML)                          │
│                                                             │
│   TRIGGER → STEP 1 → STEP 2 → STEP 3 → OUTPUT              │
│     │         │         │         │                         │
│     ▼         ▼         ▼         ▼                         │
│  whatsapp  actor    order     mpesa                         │
│  .received .resolve .create   .initiate                     │
│                                                             │
│   {{ expressions }} connect outputs to inputs               │
└─────────────────────────────────────────────────────────────┘
```

**Core Insight**: Infinite workflows from finite, composable actions.

---

## Key Concepts

| Concept | Description | Documentation |
|---------|-------------|---------------|
| **Action** | Atomic operation (e.g., `whatsapp.send`) | [[architecture/KCOS-ACTION-SPECIFICATION]] |
| **Workflow** | YAML definition wiring actions together | [[architecture/KCOS-WORKFLOW-SPECIFICATION]] |
| **Trigger** | What starts a workflow (event, schedule) | [[diagrams/08-trigger-catalog]] |
| **Expression** | `{{ }}` syntax for data flow (JSONata) | [[architecture/KCOS-WORKFLOW-SPECIFICATION]] |

---

## Action Categories

| Category | Actions | Purpose |
|----------|---------|---------|
| **communication** | `whatsapp.send`, `sms.send` | Send messages |
| **payment** | `mpesa.initiate`, `payment.record` | Handle money |
| **identity** | `actor.resolve` | Manage participants |
| **data** | `order.create`, `event.log` | Store information |
| **qr** | `qr.generate`, `qr.decode` | QR operations |
| **control** | `condition.if`, `loop.each` | Flow control |
| **integration** | `webhook.call` | External systems |

---

## Diagrams

| Diagram | Purpose |
|---------|---------|
| [[diagrams/01-system-architecture]] | High-level system view |
| [[diagrams/02-lego-architecture]] | Composability model |
| [[diagrams/03-action-registry]] | All available actions |
| [[diagrams/04-workflow-execution]] | How workflows run |
| [[diagrams/05-data-architecture]] | Event sourcing & data |
| [[diagrams/06-integration-patterns]] | Foreign system integration |
| [[diagrams/07-multi-tenant]] | Business isolation |
| [[diagrams/08-trigger-catalog]] | All trigger types |
| [[diagrams/09-example-workflows]] | Reusable patterns |
| [[diagrams/10-kenya-context]] | Kenya specifics |

---

## Reading Order

### Understanding (2 hours)
1. [[architecture/KCOS-LEGO-ARCHITECTURE]] - Core philosophy
2. [[architecture/KCOS-COMMERCE-PRIMITIVES]] - Universal patterns
3. [[diagrams/01-system-architecture]] - Visual overview

### Building (reference)
4. [[architecture/KCOS-ACTION-SPECIFICATION]] - Create actions
5. [[architecture/KCOS-WORKFLOW-SPECIFICATION]] - Define workflows
6. [[diagrams/09-example-workflows]] - Copy patterns

### Planning
7. [[architecture/KCOS-IMPLEMENTATION-PLAN]] - 6-week plan
8. [[architecture/ROADMAP]] - Long-term vision
9. [[diagrams/06-integration-patterns]] - Foreign integrations

---

## Tags

#kcos #kenya #commerce #whatsapp #mpesa #workflows

---

*Last Updated: January 17, 2026*
