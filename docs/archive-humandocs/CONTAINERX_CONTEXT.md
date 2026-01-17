# ContainerX Context (Canonical)

Purpose: This document anchors the long-term product motive and architecture direction. It clarifies how ElixoSense fits inside ContainerX and how future WhatsApp workflows will be modularized.

## Identity
- **ContainerX**: Platform that connects Kenyan commerce workflows to foreign tools and vice versa.
- **ElixoSense**: First customer and first workflow product inside ContainerX.
- **Target**: WhatsApp + M-Pesa commerce organizers for Nairobi merchants (Kamau persona).

## Product Structure
- **ContainerX core**: shared platform services (identity, messaging, payments, audit, workflow engine).
- **Workflow products**: vertical flows (ElixoSense now, barber shop later, salon later).
- **Goal**: build once in core, then ship new WhatsApp workflows as modular products.

## Non-negotiable Principles
- **Event-first**: everything becomes an event with immutable audit history.
- **Idempotency**: webhooks and callbacks must be safe on retries.
- **Organizer-first**: WhatsApp remains customer UX, we own the merchant control tower.
- **Offline-aware**: must survive Nairobi connectivity reality.
- **Swahili-native**: UI and labels prioritized for local language.

## Core Architecture Direction (Platform)
Input channels normalize into events:
- WhatsApp, SMS, calls, walk-ins, web orders, future APIs.

Processing pipeline:
- **Ingestion** → **Parser** → **State machine** → **Actions**.

Output actions:
- Messaging (WhatsApp/SMS), payments (M-Pesa), evidence, analytics, exports.

## Canonical Data Model Direction
ContainerX adopts an append-only event ledger as the source of truth, with derived views:
- `commerce_events` (event stream)
- `orders_view`, `payments_view`, `customers_view` (derived views)

This is the north star model. Individual workflow products can add tables, but the event ledger is the contract.

## ElixoSense as First Customer
ElixoSense will validate:
- WhatsApp ingestion + M-Pesa idempotent callbacks
- Ticket/order lifecycle state machine
- Evidence and audit log integrity

After ElixoSense reaches a stable full trade flow, ContainerX core will be extracted and reused.

## Where to Store Ideas and Plans
- **Operations / how-to**: `humandocs/HUMAN_GUIDE.md`
- **Decisions and invariants**: `docs/adr/`
- **Platform context**: this file
- **ElixoSense roadmap**: `elixosense-whatsapp/docs/inputs/kenya-commerce-os-roadmap.md`
- **Raw context dump**: `humandocs/KENYA_COMMERCE_OS_CONTEXT_DUMP.md`

## Foundation Focus (No Predictions)
- Hardening webhooks + idempotency keys
- State machine correctness for ticket/order lifecycle
- Audit logs and dispute-grade history
- Minimal, reusable core services for next workflows
