# ADR-0002: Ledger, audit trail, and idempotency model

## Context
We need dispute-grade evidence for a health-adjacent commerce flow (advice trail, payment confirmations, delivery events). Webhooks and callbacks will be retried and can arrive out of order. Serverless functions can be invoked concurrently.

## Decision
We use an append-only event/audit model in Postgres:
- All meaningful changes (state transitions, payments, evidence links, admin actions) are written to an **append-only** audit stream (`state_logs` or equivalent).
- Mutations to primary records (e.g., `tickets`) must be explainable by audit history.
- **No hard deletes** for domain data in MVP. Only soft-delete where required for retention policy.
- Every external interaction is **idempotent**:
  - WhatsApp webhooks are deduped (Meta retries are expected).
  - Outbound message sends must not double-send on retries.
  - M-Pesa callbacks must not double-apply payment results.

Implementation conventions:
- Store an `idempotency_key` on relevant tables (or a dedicated idempotency table) and enforce uniqueness where appropriate.
- Prefer deterministic keys derived from upstream message IDs / callback IDs when available.

## Status
Accepted

## Consequences
- Strong auditability and easier dispute exports.
- Extra storage growth; we rely on Postgres + retention policies for long-term cost control.
- Engineering discipline required: every route must write logs and respect idempotency.

## Alternatives considered
- Full event-sourcing framework: rejected for MVP complexity.
- Rely on only “current state” rows without append-only logs: rejected (weak dispute trail).

