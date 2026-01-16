# 🇰🇪 Kenya Commerce OS

> **Turning WhatsApp + M-Pesa chaos into organized commerce for Kenyan merchants.**

A multi-tenant commerce platform built specifically for merchants who receive orders via WhatsApp and get paid via M-Pesa. Swahili-first, offline-capable, and built for the Nairobi reality.

## ✨ What This Is

Kenya Commerce OS is **not another e-commerce platform**. It's an **organizer** that:

- 📱 **Parses messy WhatsApp messages** into structured orders ("Nataka 2 kg sukari" → Order)
- 💰 **Auto-links M-Pesa payments** to orders (no more manual matching!)
- 📊 **Gives merchants a dashboard** to see what needs attention NOW
- 🌐 **Works offline** (survives Nairobi's internet reality)
- 🇰🇪 **Speaks Swahili first** (English is secondary)

### **ElixoSense: Our First Client**

ElixoSense (e-commerce business) is the first tenant. They're live-testing this system and helped define the requirements.

---

## 🏗️ Architecture (Short)

### **Immutable `commerce_events` + Explicit Orders/Payments**

Everything is logged into the append-only `commerce_events` table (audit trail),
while `orders` and `payments` are explicit tables used for fast reads and
outstanding balance tracking. This hybrid model keeps the audit trail immutable
and the operational flow fast.

### **NairobiChaosParser™**

The secret sauce that turns this:
```
"Nataka 2 kg sukari na maziwa lita 3"
```

Into this:
```json
{
  "items": [
    {"product": "sukari", "qty": 2, "unit": "kg"},
    {"product": "maziwa", "qty": 3, "unit": "lita"}
  ],
  "language": "sw"
}
```

### **Multi-Tenant from Day 1**

- Every table has `business_id`
- Row Level Security (RLS) enforces isolation
- Shared codebase, per-tenant configuration

---

## 🚀 Getting Started (Sandbox)

### Prerequisites
- Node.js 18+
- Supabase project (cloud or local)
- Daraja sandbox credentials (for STK Push)
- Meta WhatsApp Cloud API app (for webhook tests)

### Required Environment Variables

**Merchant Svelte PWA** (`apps/merchant-svelte/.env`):
```bash
PUBLIC_SUPABASE_URL=https://wwjsvzhosbrsotmknrtp.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_BUSINESS_ID=elixosense
```

**Storefront Svelte App** (`apps/storefront-svelte/.env`):
```bash
PUBLIC_SUPABASE_URL=https://wwjsvzhosbrsotmknrtp.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase Edge Functions** (project env vars):
```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://wwjsvzhosbrsotmknrtp.functions.supabase.co/mpesa-callback
MPESA_ENVIRONMENT=sandbox
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
WHATSAPP_ACCESS_TOKEN=...
```

### Install + Run
```bash
cd /path/to/WABAAA
cd apps/merchant-svelte && npm install
npm run dev  # http://localhost:5173
```

### Storefront App (Digital Duka)
```bash
cd apps/storefront-svelte && npm install
npm run dev  # http://localhost:5173
```

### Build for Production
```bash
cd apps/merchant-svelte
npm run build  # Outputs to build/
npm run preview  # Test production build locally
```

### Tests
```bash
deno test --no-check supabase/functions/_tests/
```
Schema checks are manual for now; see verification queries in
`packages/database/migrations/0003_create_explicit_orders_payments.sql`.

### Manual Sandbox Flows
1. Create an order in the PWA (online or offline).
2. Call `generate-payment-link` for that order.
3. Use Daraja sandbox “Simulate” to hit `mpesa-callback`.
4. Verify order `outstanding_amount` drops and a single payment row appears.

See `SPEC.md` for event types and immutability rules.

---

## 📁 Project Structure

```
repo-root/
├── apps/                      # Frontend applications
│   ├── merchant/             # 🌟 React PWA (legacy, being replaced)
│   └── merchant-svelte/      # ✨ NEW: Svelte 5 PWA (<100KB, offline-first)
│
├── supabase/                  # Backend (Supabase)
│   ├── functions/            # Edge Functions (Deno)
│   │   ├── whatsapp-webhook/ # WhatsApp message ingestion
│   │   ├── mpesa-callback/   # M-Pesa payment callbacks
│   │   ├── generate-payment-link/ # STK Push trigger
│   │   └── dev-data/         # Dev-only test data endpoint
│   └── migrations/           # Database migrations
│
├── packages/                  # Shared libraries
│   └── database/             # 🗄️ Schema & types
│       └── migrations/       # SQL migrations (0001, 0002, 0003)
│
└── docs/                      # Documentation
    ├── CONTEXT.md            # 📖 Full project context
    ├── ELIXOSENSE.md         # ElixoSense requirements
    └── ROADMAP.md            # Development roadmap
```

---

## 🎯 Core Features (MVP)

### ✅ Phase 1 Complete (January 2026)
- Multi-tenant schema + RLS (13 tables)
- `commerce_events` append-only audit log
- Explicit `orders`/`payments` with outstanding tracking
- WhatsApp auto-reply (NairobiChaosParser)
- M-Pesa STK Push + QR metadata processing
- QR code system (4 types)
- Daily SMS/WhatsApp summary
- Payment reminders
- Multi-business-type support (mini_supermarket, restaurant)
- Customer financial profiles (partner-ready)
- Business financial metrics
- Security audit logging
- Offline PWA with real-time sync
- "Perfect Nairobi Dashboard" (5 screens)

### 📋 Phase 2 (Planned)
- Lending partner integration
- Insurance partner integration
- Settlement partner integration
- Real-time inventory synchronization
- Multi-channel customer segments
- Broadcast messaging system

---

## 🛠️ Development Workflow

### Running Locally

```bash
# Database (Supabase)
cd packages/database
supabase start         # Start local Supabase
npm run studio         # Open Supabase Studio

# Merchant App
cd apps/merchant
npm run dev            # http://localhost:3000

# Generate types after schema changes
cd packages/database
npm run types
```

### Testing Parser

```typescript
import { createParser } from '@kenya-commerce-os/core/chaos-parser';

const parser = createParser();
const result = parser.parse("Nataka 2 kg sukari na maziwa lita 3");

console.log(result.type);  // "order"
console.log(result.data.items);  // [{product: "sukari", qty: 2, unit: "kg"}, ...]
```

### Adding a New Tenant

1. Copy `clients/template/` → `clients/new-business/`
2. Update `config.json` with business details
3. Run seed script to create business in database
4. Configure WhatsApp and M-Pesa webhooks
5. Deploy merchant app with business context

---

## 🌍 Deployment

### Merchant App (Vercel)

```bash
cd apps/merchant
vercel deploy
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BUSINESS_ID`

### Database (Supabase)

Migrations run automatically via Supabase CLI:
```bash
cd packages/database
supabase db push --db-url [production-url]
```

### Edge Functions (Supabase)

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy mpesa-callback --no-verify-jwt
supabase functions deploy generate-payment-link
```

---

## 📚 Key Concepts

### **Event-Sourced Architecture**

All state is derived from events. Want to know a customer's order history? Query `commerce_events` where `customer_phone = X`.

### **Idempotency**

Every event has an `idempotency_key`. Webhooks can be retried safely without double-processing.

### **Business Continuity**

- WhatsApp blocked? → SMS fallback kicks in
- Internet down? → Offline queue syncs later
- M-Pesa down? → Manual payment verification

### **Swahili-First**

The UI is in Swahili by default. English is a toggle, not the primary language.

---

## 🎓 Documentation

### 📖 Core Documentation
- **[START-HERE.md](START-HERE.md)** - Project overview and quick start
- **[KAMAU-READY.md](KAMAU-READY.md)** - MVP guide for merchants
- **[TEST-REPORT.md](TEST-REPORT.md)** - Comprehensive test results (47/47 passed)

### 🏗️ Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical system design + 7 diagrams
- **[BUSINESS_MODEL.md](BUSINESS_MODEL.md)** - Business context + 5 diagrams
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Operations guide + 3 diagrams

### 📊 Database & Flows
- **[docs/database/SCHEMA.md](docs/database/SCHEMA.md)** - Database ERD + table details
- **[docs/flows/](docs/flows/)** - Sequence diagrams (Mini-Supermarket, Restaurant, Multi-Tenant)
- **[docs/state-machines/](docs/state-machines/)** - State machines (Orders, Payments)

### 🔌 Integrations
- **[docs/integrations/WHATSAPP.md](docs/integrations/WHATSAPP.md)** - WhatsApp Cloud API setup
- **[docs/integrations/MPESA.md](docs/integrations/MPESA.md)** - M-Pesa Daraja integration
- **[docs/integrations/SMS.md](docs/integrations/SMS.md)** - Africa's Talking SMS

### 🎯 Features
- **[QR_IMPLEMENTATION.md](docs/QR_IMPLEMENTATION.md)** - QR code system (4 types)
- **[PARTNER_INTEGRATION.md](docs/PARTNER_INTEGRATION.md)** - Partner API guide
- **[SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)** - Bank-grade security foundation
- **[DASHBOARD-COMPLETE.md](DASHBOARD-COMPLETE.md)** - Nairobi Commerce Dashboard

### 🚀 Deployment Guides
- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Step-by-step deployment
- **[QUICK-START.md](QUICK-START.md)** - Fast path to production
- **[VERIFY-SETUP.md](VERIFY-SETUP.md)** - Webhook verification & testing

---

## 🤝 Contributing

This is a **solo-dev project** for now, but contributions are welcome!

### Guidelines

- Swahili UI labels must be natural (not Google Translate)
- All external interactions must be idempotent
- Write migrations, never alter existing ones
- Test offline mode (simulate internet drop)
- Document decisions in ADRs

---

## 📝 Tech Stack (Locked)

| Layer | Technology |
|-------|------------|
| **Frontend** | Svelte 5 + SvelteKit + TypeScript |
| **PWA** | Service Worker + IndexedDB (offline-first) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Integrations** | Direct APIs (Meta WhatsApp, Safaricom Daraja) |
| **Hosting** | Vercel (frontend) + Supabase (backend) |
| **Language** | Swahili-first (Kenya) |
| **Bundle Size** | <100KB total (optimized for 3G networks) |

---

## 🚦 Status

**Current Phase:** 🚀 Production Ready (Phase 1 Complete)

### ✅ Core Features
- ✅ Multi-tenant schema with RLS (13 tables)
- ✅ Event-sourced architecture (`commerce_events`)
- ✅ WhatsApp auto-reply with NairobiChaosParser
- ✅ M-Pesa STK Push + callback handling
- ✅ QR code system (4 types: Product, Invoice, Shop, Menu)
- ✅ Daily SMS/WhatsApp summary
- ✅ Payment reminders
- ✅ Offline-first Svelte 5 PWA (<100KB)
- ✅ "Perfect Nairobi Dashboard" (Leo, Deni, Bidhaa, Wateja, Sawa)

### ✅ Multi-Business Support
- ✅ Mini-supermarket template
- ✅ Restaurant template (menu items + modifiers)
- ✅ Parser registry for business-type routing
- ✅ Business-specific configuration

### ✅ Industrial Foundation (Phase 1)
- ✅ Customer financial profiles (credit scoring)
- ✅ Business financial metrics (working capital, margins)
- ✅ Partner-ready API gateway
- ✅ Bank-grade security audit logging
- ✅ Financial audit trail (compliance)
- ✅ Encryption at rest
- ✅ Rate limiting on all endpoints

### ✅ Deployment
- ✅ 15 Edge Functions deployed and active
- ✅ 7 database migrations applied
- ✅ Comprehensive documentation (12 docs)
- ✅ Test report (47/47 tests passed)

### 📋 Next: User Acceptance Testing
- Configure WhatsApp webhook (Meta Business Account)
- Configure M-Pesa credentials (Daraja API)
- Configure SMS (Africa's Talking)
- Test with Kamau (first merchant)
- Monitor first 100 transactions

---

## 📞 Support

- **Issues:** GitHub Issues (if public) or project tracker
- **Docs:** `docs/` directory
- **Client Support:** Via WhatsApp to business owner

---

## 📜 License

Private project. All rights reserved.

---

## 🙏 Acknowledgments

- **ElixoSense** - First client and product co-creator
- **Kenyan merchants** - The real heroes running businesses on WhatsApp
- **Supabase** - Amazing platform for building fast
- **Meta & Safaricom** - For (mostly) stable APIs

---

**Built with ❤️ for Kenyan merchants who deserve better tools.**

---

## 🔥 Quick Commands Cheat Sheet

```bash
# Start Svelte PWA locally
cd apps/merchant-svelte
npm install
npm run dev  # http://localhost:5173

# Build for production
cd apps/merchant-svelte
npm run build

# Deploy to Vercel
cd apps/merchant-svelte
vercel deploy

# Test Edge Functions
deno test --no-check supabase/functions/_tests/

# Deploy Edge Functions
supabase functions deploy whatsapp-webhook
supabase functions deploy mpesa-callback --no-verify-jwt
supabase functions deploy generate-payment-link
supabase functions deploy dev-data

# Check database
supabase db remote status
```

---

**Last Updated:** January 17, 2026  
**Version:** 1.0.0 (Phase 1 Complete - Production Ready)  
**Test Status:** ✅ 47/47 Tests Passed  
**Deployment Status:** 🟢 All Systems Operational
