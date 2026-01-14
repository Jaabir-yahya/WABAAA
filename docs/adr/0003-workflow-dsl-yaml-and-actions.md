# ADR-0003: Workflow DSL (YAML), actions, and validation

## Context
We need repeatable, reviewable workflows that are easy to change without rewriting code, but still safely typed and validated (no “stringly-typed” state machine).

## Decision
- Workflow definitions are stored as **YAML** under `src/workflows/`.
- YAML is parsed at runtime by a dedicated loader (e.g., `src/workflows/loader.ts`).
- Parsed workflows must be validated using **Zod schemas** to produce a typed internal model.
- Workflows are executed via **xstate** with a thin orchestration layer (`src/lib/orchestration.ts`).

Action model:
 - Workflows may emit a constrained set of action types (examples):
   - `send_whatsapp_message`
   - `request_mpesa_stk`
   - `schedule_reminder`
   - `save_evidence`
 - Action execution happens in adapters, not inside workflow definitions.

## Status
Accepted

## Consequences
- Workflows become reviewable “product logic” with code-level validation.
- We must maintain backwards compatibility as workflows evolve (workflow versioning strategy later).
- Loader and validator become core infrastructure; tests are required.

## Alternatives considered
- Hardcode all workflows in TypeScript: rejected (too slow to iterate and review).
- No validation (parse YAML into `any`): rejected (unsafe, brittle).
