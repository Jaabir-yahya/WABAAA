# Kenya Commerce OS - Everything Lite

**A unified commerce platform for Kenyan SMEs. One system, many use cases.**

## What Makes KCOS Different

Kenyans don't want scattered point solutions. They want **everything lite** in one place:

- Lite POS - Quick sales recording, not complex retail systems
- Lite CRM - Customer debts and history, not enterprise CRM
- Lite Bookkeeping - Expenses, suppliers, profit tracking
- Lite Services - Appointments and reminders for salons, mechanics
- Lite Restaurant - Menu, orders, kitchen - simple

## Built for Kenya

- M-Pesa first - STK Push, callbacks, reconciliation
- WhatsApp native - Orders, reminders, receipts via WhatsApp
- Offline-first - Works on 2G/3G, syncs when online
- Multi-tenant - One codebase, 1000s of businesses
- Event-sourced - Dispute-grade audit trail

## Architecture

Config-driven variability:
- Same codebase serves retail, services, restaurant
- Feature flags enable/disable modules per business
- Actions are atomic, workflows compose them
- Events are immutable, projections are queryable

## Tech Stack

- Backend: Supabase (Postgres + Auth + Edge Functions)
- Core: TypeScript actions + workflow engine
- Frontend: Svelte 5 PWAs (merchant, storefront)
- Integrations: M-Pesa Daraja, WhatsApp Cloud API, Africa's Talking SMS

## Getting Started

```bash
npm install
npm run dev:api
npm run dev:merchant
```

See [`docs/architecture/KCOS-QUICK-START.md`](docs/architecture/KCOS-QUICK-START.md) for full setup.
