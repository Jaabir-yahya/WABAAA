# UI Planning - Everything Lite

**Purpose:** Planning documents for building the Merchant PWA  
**Target:** January 20, 2026 (Tomorrow)  
**Focus:** Retail-first MVP with config-driven extensibility

---

## Document Index

| Document | Purpose |
|----------|---------|
| [[API-ENDPOINTS]] | Complete API reference with request/response examples |
| [[USER-JOURNEYS]] | User flow diagrams (Mermaid) for key tasks |
| [[OFFLINE-SYNC-STRATEGY]] | How the PWA handles offline-first operation |
| [[COMPONENT-HIERARCHY]] | UI component structure and navigation |
| [[MVP-FEATURES]] | Priority features for Day 1 vs Later |

---

## Quick Context

### What We're Building
A **phone-first PWA** for Kenyan merchants to:
- Record sales (cash, M-Pesa, credit)
- Track expenses
- Monitor customer debts
- View daily profit/loss
- Works offline (syncs when online)

### Tech Stack
- **Framework:** Svelte 5 + SvelteKit
- **Styling:** Tailwind CSS
- **Offline:** IndexedDB + Supabase Realtime
- **Auth:** Supabase Auth (JWT)
- **API:** Express + Supabase Edge Functions

### Business Types (Config-Driven)
| Type | Key Features |
|------|--------------|
| **Retail** | Sales, inventory, expenses, customer credit |
| **Services** | + Appointments, service catalog |
| **Restaurant** | + Menu, kitchen orders, tables |

---

## Design Principles

1. **Offline-First** - Every action works without internet
2. **Phone-First** - Design for 5" screens, touch targets
3. **Swahili-Ready** - Support both English and Swahili
4. **Feature-Gated** - Show only enabled features per business config
5. **Fast** - < 3 second initial load, instant local actions

---

## Starting Point

Begin with: [[USER-JOURNEYS#Morning Opening Routine]]

Then reference: [[API-ENDPOINTS]] for implementation details
