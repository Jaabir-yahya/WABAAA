# Kenya Commerce OS (KCOS)

**A commerce platform for Kenya built on WhatsApp, M-Pesa, and QR.**

KCOS is organized around **commerce primitives** (Order Intake, Identity, Payment, Notification, Reconciliation). Industries become **configuration**, not bespoke code.

## What KCOS Is

- **Composable actions** that can be wired into workflows
- **Kenya-first channels**: WhatsApp + M-Pesa + QR with SMS fallback
- **Workflow engine** that executes YAML definitions
- **Multi-tenant by default** with an event store and idempotency

## Commerce Primitives (The Core Idea)

Every industry repeats the same core moves. KCOS targets the 80% common pattern:

- Order Intake → Identity → Catalog/Inventory → Pricing → Payment → Fulfillment → Notification → Reconciliation

See [`docs/KCOS-COMMERCE-PRIMITIVES.md`](docs/KCOS-COMMERCE-PRIMITIVES.md) for the full framework and pattern workflows.

## Current State (Built)

- **Workflow engine** with branching and step execution
- **Action system** + registry + helpers
- **12 actions** (Kenya + built-ins): `whatsapp.send`, `mpesa.initiate`, `mpesa.verify`, `order.create`, `actor.resolve`, `qr.generate`, `qr.decode`, `debug.log`, `event.log`, `condition.if`, `data.transform`, `http.request`
- **HTTP API server** to execute workflows
- **Workflow DSL** (YAML) with loader
- **Idempotency system** + workflow tables
- **First workflow**: `workflows/elixosense/order-flow.yaml`

## Getting Started (API + Core)

```bash
# Install dependencies
npm install

# Run the KCOS API server (workflow execution)
npm run dev:api

# Run core tests
npm run test:core
```

## Project Structure (Key Paths)

```
repo-root/
├── apps/                    # Frontend apps (merchant, svelte PWA)
├── packages/
│   ├── api/                 # HTTP API server
│   ├── core/                # Actions, workflows, expressions, idempotency
│   ├── database/            # Migrations and schema
│   └── integrations/        # External integration helpers
├── supabase/                # Edge Functions (Deno) + migrations
├── workflows/               # YAML workflow definitions
└── docs/                    # KCOS documentation
```

## Documentation

Start here:

- [`docs/KCOS-DOCUMENTATION-INDEX.md`](docs/KCOS-DOCUMENTATION-INDEX.md)
- [`docs/KCOS-COMMERCE-PRIMITIVES.md`](docs/KCOS-COMMERCE-PRIMITIVES.md)
- [`docs/KCOS-LEGO-ARCHITECTURE.md`](docs/KCOS-LEGO-ARCHITECTURE.md)
- [`docs/KCOS-QUICK-START.md`](docs/KCOS-QUICK-START.md)

## Tech Stack (Locked)

- **Frontend**: Svelte 5 + SvelteKit + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Workflow engine**: KCOS core (Temporal planned)
- **Expressions**: JSONata

## Status

**Phase:** Foundation + workflow engine ready  
**Next:** Add more pattern workflows + industry configs

---

**Built for Kenyan merchants who deserve better tools.**
