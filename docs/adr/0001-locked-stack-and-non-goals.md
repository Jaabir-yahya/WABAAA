# ADR-0001: Locked stack and non-goals (ContainerX pivot)

## Context
This project has pivoted to ContainerX: a FastAPI backend focused on Nairobi SME workflows and Africa's Talking integrations. The stack must support long-running services, background processing, and stable database connectivity while keeping operational complexity reasonable.

We need a stack that:
- Supports containerized services and background workers.
- Keeps payment and messaging integrations clear and auditable.
- Minimizes unnecessary dependencies for an early-stage build.

## Decision
We lock the MVP stack to the following:
- **Backend**: FastAPI (Python) with REST endpoints.
- **Database**: PostgreSQL (local via Docker Compose, production target TBD).
- **ORM/migrations**: SQLAlchemy + Alembic.
- **Background jobs**: Celery + Redis.
- **Integrations**: Africa's Talking (SMS + M-Pesa). WhatsApp is out of scope for this pivot.
- **Containers**: Docker for local dev and deployment parity.
- **Observability**: Structured logging now, Sentry optional later.

## Status
Accepted

## Consequences
- We can run persistent services and background workers needed for payment flows.
- We accept deployment complexity from containerized services.
- We will not add extra queues/event buses beyond Celery/Redis in MVP.

## Alternatives considered
- Serverless-only architecture: rejected (needs long-running workers for payment workflows).
- Supabase + Drizzle stack: rejected for this pivot to a Python backend.

