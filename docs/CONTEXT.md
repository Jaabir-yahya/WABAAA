# Kenya Commerce OS - Project Context

## 🎯 One-Liner
**Kenya Commerce OS turns WhatsApp + M-Pesa chaos into organized commerce for Kenyan merchants.**

## What This Is
A multi-tenant commerce platform built specifically for Kenyan merchants who receive orders via WhatsApp and get paid via M-Pesa. It provides:
- **Chaos → Order**: Parse messy Swahili/English WhatsApp messages into structured orders
- **Payment Intelligence**: Automatically link M-Pesa payments to orders
- **Merchant Dashboard**: Swahili-first PWA for organizing their business
- **Business Continuity**: WhatsApp → SMS fallback, offline-first architecture

## ElixoSense: Our First Client
ElixoSense is an e-commerce business run by the founder's cousin. They are our first tenant and helped define the requirements for this platform.

### ElixoSense Requirements:
- WhatsApp ordering for e-commerce products
- M-Pesa payment integration
- Order tracking and customer history
- Basic inventory sync with existing website
- Multi-channel support (WhatsApp, web orders, walk-ins)

## Architecture Philosophy

### The Commerce Event: Single Source of Truth
Everything flows through the `commerce_events` table:
```
customer_message → commerce_event (type: message)
payment_received → commerce_event (type: payment)
order_fulfilled → commerce_event (type: fulfillment)
```

### NairobiChaosParser: The Core Magic
Parses natural Swahili/English messages into structured data:
```
"Nataka 2 kg sukari na maziwa lita 3"
→ Order: {items: [{product: "sukari", qty: 2, unit: "kg"}, {product: "maziwa", qty: 3, unit: "lita"}]}
```

### Multi-Tenant from Day 1
- Every table has `business_id` (tenant identifier)
- Row Level Security (RLS) enforces data isolation
- Tenant configuration in `clients/` directory
- Shared codebase, customized per tenant

## Technical Stack (LOCKED)

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **PWA**: Offline-first with Service Worker
- **State**: Zustand or Jotai (lightweight)
- **Language**: Swahili-first UI with English toggle

### Backend
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (email/password, magic link)
- **Realtime**: Supabase Realtime subscriptions
- **Functions**: Supabase Edge Functions (Deno)
- **Storage**: Supabase Storage (evidence, receipts)

### Integrations
- **WhatsApp**: Meta WhatsApp Cloud API (direct)
- **M-Pesa**: Safaricom Daraja API (direct, no middleman)
- **SMS Fallback**: Africa's Talking or Twilio

### Hosting
- **Frontend**: Vercel
- **Backend**: Supabase (managed)
- **Domain**: TBD (Kenya-based registrar)

## Core Principles

### 1. Nairobi-First Design
- Swahili language priority
- Works with intermittent internet (offline-first)
- Mobile-first (most merchants use phones)
- Low data usage (expensive in Kenya)

### 2. Organizer-Centric
- Merchants are the primary users
- Customers interact via WhatsApp (no app needed)
- Dashboard shows "what needs attention now"
- Quick actions (send payment request, mark fulfilled)

### 3. Event-Sourced Truth
- `commerce_events` is append-only
- All state derived from events
- Audit trail for disputes
- Easy reconciliation

### 4. Business Continuity
- WhatsApp gets blocked → SMS fallback kicks in
- Internet drops → offline queue syncs later
- M-Pesa down → manual payment verification
- System survives real-world chaos

### 5. Solo-Dev Friendly
- Monorepo (everything in one place)
- TypeScript for type safety
- Clear separation of concerns
- Well-documented decisions

## Data Model (High-Level)

### Core Tables
```sql
commerce_events       -- Single source of truth (append-only)
businesses           -- Tenants (merchants)
customers            -- Customer records (per business)
orders_view          -- Materialized view from events
payments_view        -- Materialized view from events
inventory_view       -- Materialized view from events
```

### Event Types
```
message.inbound      -- Customer sent WhatsApp message
message.outbound     -- Merchant sent WhatsApp message
payment.received     -- M-Pesa payment confirmed
payment.requested    -- Merchant requested payment
order.created        -- Order extracted from messages
order.fulfilled      -- Order marked as complete
inventory.updated    -- Inventory count changed
```

## Repository Structure

```
kenya-commerce-os/
├── apps/                    # Frontend applications
│   ├── admin/              # Admin dashboard (super-admin)
│   ├── merchant/           # Merchant organizer (main PWA)
│   └── customer/           # Customer catalog (optional)
├── packages/               # Shared libraries
│   ├── database/          # Supabase schema, migrations, types
│   ├── core/              # Business logic (parser, processor)
│   └── integrations/      # External APIs (WhatsApp, M-Pesa)
├── clients/               # Tenant configurations
│   ├── elixosense/        # First client config
│   └── template/          # Template for new tenants
├── archive/               # Old code (reference only)
└── docs/                  # Documentation
```

## Key Features

### Phase 1: MVP (Current Focus)
- ✅ WhatsApp message ingestion
- ✅ M-Pesa payment callbacks
- ✅ NairobiChaosParser (basic Swahili parsing)
- ✅ Merchant dashboard (orders, payments, customers)
- ✅ Multi-tenant architecture
- ✅ Offline-first PWA

### Phase 2: ElixoSense Launch
- E-commerce integration (sync products)
- Customer catalog (WhatsApp mini-app)
- Inventory tracking
- Basic analytics
- SMS fallback

### Phase 3: Scale
- Add more merchants
- Advanced parser (ML/AI)
- Voice orders (Swahili speech-to-text)
- Multi-channel (USSD, web, API)

## Non-Goals (MVP)

### ❌ Not Building (Yet)
- Complex inventory management
- Advanced analytics/BI
- Multi-user roles (only business owner)
- White-label customization
- API for external developers
- Mobile apps (PWA is enough)

## Development Workflow

### Local Setup
1. Clone repo
2. Set up Supabase project
3. Run migrations
4. Start merchant app (`npm run dev`)
5. Test with ngrok + WhatsApp sandbox

### Deployment
- Push to `develop` → Vercel preview
- Push to `main` → Production
- Migrations run via Supabase CLI
- Edge Functions deployed via Supabase

## Success Metrics

### For ElixoSense (First 30 Days)
- 100% of WhatsApp orders captured
- 90% of M-Pesa payments auto-linked
- <5 min from order to payment request sent
- Works offline during internet outages

### Platform (First 3 Months)
- 5 active merchants
- 1000+ orders processed
- <1% event processing errors
- 99.9% uptime

## Contact & Context

### Project Owner
Solo dev, building for real Kenyan merchants starting with family (ElixoSense).

### Repository
Private monorepo, Git-based workflow.

### Decision Log
See `docs/adr/` for Architecture Decision Records.

---

**Last Updated**: January 16, 2026  
**Status**: Active Development (Post-Pivot)  
**Next Milestone**: ElixoSense MVP Launch
