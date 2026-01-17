# ADR-0005: ContainerX pivot and scope

## Context
The project has pivoted from the ElixoSense WhatsApp-first serverless MVP to a ContainerX backend that targets Nairobi SME workflows with Africa's Talking integrations. The new scope requires a Python backend, persistent services, and background task processing.

## Decision
- Build and evolve ContainerX as a standalone backend within this repo under `containerx/`.
- Use FastAPI + SQLAlchemy + Alembic, with Redis + Celery for background work.
- Integrate Africa's Talking for SMS and M-Pesa flows.
- WhatsApp features are out of scope for the pivot.

## Status
Accepted

## Consequences
- Existing ElixoSense docs remain as historical context but are no longer the delivery target.
- Documentation updates must describe the ContainerX stack, setup, and testing flow.
- The MVP focuses on payment confirmation and receipt workflows before other integrations.

## Alternatives considered
- Continue with the serverless WhatsApp-first stack: rejected due to pivot requirements.
- Split into a separate repo: deferred to keep context and docs in one place for now.
