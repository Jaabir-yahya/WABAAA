# Architecture Decision Records (ADRs)

**Key architectural decisions for KCOS**

---

## What are ADRs?

ADRs document significant architectural decisions made during development. They capture:
- **Context**: Why the decision was needed
- **Decision**: What was decided
- **Consequences**: Trade-offs and implications

---

## ADR Index

| # | Title | Status |
|---|-------|--------|
| 0000 | [[0000-template\|Template]] | Template |
| 0001 | [[0001-locked-stack-and-non-goals\|Locked Stack & Non-Goals]] | ✅ Accepted |
| 0002 | [[0002-ledger-audit-and-idempotency\|Ledger, Audit & Idempotency]] | ✅ Accepted |
| 0003 | [[0003-workflow-dsl-yaml-and-actions\|Workflow DSL (YAML) & Actions]] | ✅ Accepted |
| 0004 | [[0004-security-model-supabase-auth-and-rls\|Security Model (Supabase Auth & RLS)]] | ✅ Accepted |
| 0005 | [[0005-containerx-pivot\|ContainerX Pivot]] | ✅ Accepted |

---

## Key Decisions Summary

### ADR-0001: Locked Stack
- **TypeScript** + **Supabase** + **Svelte**
- No ORMs, no microservices, no Kubernetes
- Focus on Nairobi-first commerce

### ADR-0002: Event Sourcing
- Append-only `commerce_events` table
- Idempotency keys on all operations
- Full audit trail

### ADR-0003: Workflow DSL
- YAML-based workflow definitions
- Composable actions
- JSONata expressions

### ADR-0004: Security Model
- Supabase Auth for identity
- Row Level Security (RLS) for isolation
- Per-tenant scoping

### ADR-0005: ContainerX Pivot
- Pivot from container tracking to commerce OS
- Broader applicability
- Same core architecture

---

## Creating New ADRs

Use [[0000-template]] as a starting point:

```
# ADR-XXXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
Why is this decision needed?

## Decision
What did we decide?

## Consequences
What are the trade-offs?
```

---

## Back to Main Docs

- [[../HOME|← Home]]

---

#kcos #adr #architecture #decisions
