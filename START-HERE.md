# START HERE: Kenya Commerce OS - Everything Lite

**Status:** Core-Outwards Build Complete | Everything Lite Architecture  
**Focus:** Unified lite suite for Kenya SMEs - Retail, Services, Restaurant, Bookkeeping

---

## What KCOS Is Now

KCOS is a **unified "lite everything" commerce platform** for Kenya. One system that provides:

- Lite POS (sales, inventory counts)
- Lite CRM (customer debts, payment history)
- Lite Bookkeeping (expenses, supplier debts, commissions)
- Lite Services (appointments, reminders)
- Lite Restaurant (menu, orders, kitchen)

**Built for Kenya:**
- M-Pesa + WhatsApp + SMS
- Offline-first (IndexedDB sync)
- Multi-tenant with RLS
- Event-sourced audit trail
- Config-driven variability

---

## Architecture: Three-Layer Variability

1. **Config** - Business type defines features (retail, services, restaurant)
2. **Actions** - Atomic operations (50+ built-in)
3. **Workflows** - Conditional compositions based on config

Same business type can have different features without code changes.

---

## Quick Start

See [`docs/architecture/KCOS-QUICK-START.md`](docs/architecture/KCOS-QUICK-START.md)

---

## Documentation Index

See [`docs/architecture/KCOS-DOCUMENTATION-INDEX.md`](docs/architecture/KCOS-DOCUMENTATION-INDEX.md)

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run KCOS API server (workflow execution)
npm run dev:api

# Run core tests
npm run test:core
```
