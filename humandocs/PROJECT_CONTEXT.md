# Project Context Packet (paste into any LLM)

## One-liner
ElixoSense Kenya WhatsApp-first conversational commerce + support MVP: webhook ingestion → workflow/state machine → payments → evidence → admin ops.

## What this is
This doc is a **single, canonical “context packet”** you can paste into any LLM before asking questions, so the model has the full project context and constraints.

## Product scope (MVP)
- WhatsApp Cloud API webhook ingestion + outbound messaging
- Ticket lifecycle driven by **xstate** and **YAML workflows**
- Payments via **M-Pesa Daraja (STK Push)** + manual verification fallback
- Evidence storage in **Supabase Storage**
- Admin dashboard at `/admin` (React Admin)

## Non-goals (MVP)
- Multi-tenant (single tenant: ElixoSense)
- Multi-user RBAC beyond `is_admin`
- External queues/event buses (retry via DB + cron only)
- Analytics / BI dashboards

## Locked tech stack (do not change without PM sign-off)
- **Deployment**: Vercel, Next.js App Router (serverless), target region `eu-west-1`
- **DB/Auth/Storage/RLS**: Supabase Postgres + Supabase Auth + Supabase Storage
- **ORM/migrations**: Drizzle ORM + SQL migrations
- **Workflow engine**: xstate + YAML DSL
- **Observability**: Sentry (planned; currently console JSON logging wrapper)
- **Scheduling**: Vercel Cron → `/api/cron/reminders` guarded by `CRON_SECRET`

Authoritative references:
- Locked stack spec: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/docs/inputs/cursor-locked-stack.md`
- ADRs: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/docs/adr/`
- Runbook: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/docs/runbook.md`

## Repository map (important folders)
- App: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/src/app/`
- API routes: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/src/app/api/`
- Adapters/services: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/src/lib/`
- DB schema + migrations: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/src/db/`
- Workflow YAMLs + loader: `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/src/workflows/`

## Core domain concepts
- **Ticket**: a customer conversation/order lifecycle record (stateful)
- **Workflow**: YAML-defined state transitions + actions (validated) executed by xstate
- **State log (audit trail)**: append-only record of meaningful events (dispute-grade)
- **Idempotency**: every external interaction must not double-apply on retries

## Data model (high-level)
Main tables (see migrations/schema for details):
- `tenants`, `users` (admin gating), `customers`, `tickets`
- `whatsapp_messages` (raw message bodies)
- `payments` + `state_logs` (audit)
- `evidence` (storage references), `scheduled_reminders` (cron-driven retries)

## External integrations
- **Meta WhatsApp Cloud API**
  - Webhook: `/api/whatsapp/webhook` (GET verify + POST events)
  - Signature verification: `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET`
- **Safaricom Daraja (M-Pesa)**
  - STK Push initiation from server
  - Callback: `/api/payments/mpesa-callback` (public URL required)
- **Supabase**
  - Auth for admin session (email/password)
  - RLS policies enforce admin-only operational data access

## Runtime flows (MVP)
### Inbound WhatsApp message → workflow progression
1. Meta sends webhook POST → `/api/whatsapp/webhook`
2. Verify signature, parse message → internal event
3. Orchestration loads workflow, transitions ticket, writes logs, emits actions
4. Actions run adapters (send WhatsApp message, request payment, schedule reminder, save evidence)

### Payment (STK push) → callback → audit update
1. Request STK push → store `payments` row (initiated)
2. Safaricom calls `/api/payments/mpesa-callback`
3. Update `payments` status + write `state_logs` (idempotent)

## Known “gotchas” / sharp edges
- Webhooks/callbacks may be retried and out-of-order → idempotency is mandatory.
- Serverless concurrency means handlers can overlap → DB constraints and idempotency keys matter.
- `.env.local` must include both browser and server Supabase keys and a valid `DATABASE_URL`.

## How to ask good LLM questions (copy/paste)
When asking any LLM, include:
- This entire doc
- The exact file/function you’re asking about
- The constraints: serverless, audit trail, no external queues, locked stack

Example question template:
“Given the locked stack and audit/idempotency requirements, propose a safe way to implement X. Show where it should live in the repo and how to test it.”

