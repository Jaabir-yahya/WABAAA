# ADR-0001: Locked stack and non-goals

## Context
This project is an 8-week MVP for ElixoSense Kenya: WhatsApp conversational commerce + support, built serverless and deployed quickly while keeping a clean upgrade path.

We need a stack that:
- Works well on serverless (scale-to-zero, no long-lived processes)
- Keeps security/compliance needs in view (EU region path, audit trail)
- Minimizes dependencies and “platform sprawl”

## Decision
We lock the MVP stack to the following:
- **Deployment**: Vercel, Next.js App Router (serverless). Target region **eu-west-1**.
- **Database**: Supabase Postgres (managed), also used for Auth + Storage.
- **ORM/migrations**: Drizzle ORM + Drizzle Kit. `src/db/schema.ts` is the single source of truth.
- **Workflow**: xstate state machine; workflow definitions are YAML under `src/workflows/`.
- **WhatsApp**: Meta WhatsApp Cloud API, with a small internal helper module (`src/lib/whatsapp.ts`). No heavy SDKs.
- **Payments**: M-Pesa Daraja STK Push + manual verification fallback.
- **Admin**: React Admin under `/admin`.
- **Observability**: Sentry.
- **Scheduling**: Vercel Cron hitting `/api/cron/reminders` guarded by a secret.

## Status
Accepted

## Consequences
- We can move fast with a small, coherent stack and a single deploy target.
- We accept some provider coupling (Supabase + Vercel) to speed MVP delivery.
- We will not add queues/event buses in MVP; retries are DB-backed and cron-driven.

## Alternatives considered
- Dedicated backend services (persistent servers): rejected (MVP must be serverless).
- Twilio/3rd-party WhatsApp providers: rejected (MVP targets Meta Cloud API directly).
- Prisma: acceptable backup option, but Drizzle is preferred for serverless connection behavior.

