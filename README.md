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

**Merchant App** (`apps/merchant/.env.local`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BUSINESS_ID=elixosense
```

**Supabase Edge Functions** (project env vars):
```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://<project>.functions.supabase.co/mpesa-callback
MPESA_ENVIRONMENT=sandbox
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
```

### Install + Run
```bash
cd /Users/jaabirahmed/Documents/projects/WABAAA/kenya-commerce-os
cd packages/database && npm install
cd ../../apps/merchant && npm install
cd ../../apps/merchant && npm run dev
```

### Tests
```bash
deno test --no-check supabase/functions/_tests/
cd apps/merchant && npm test
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
kenya-commerce-os/
├── apps/                      # Frontend applications
│   ├── admin/                # Admin dashboard (super-admin)
│   ├── merchant/             # 🌟 Merchant organizer (main PWA)
│   └── customer/             # Customer catalog (optional)
│
├── packages/                  # Shared libraries
│   ├── database/             # 🗄️ Supabase schema & migrations
│   │   ├── migrations/       # SQL migrations (0001, 0002, etc.)
│   │   ├── seed/             # Test data
│   │   └── schema/           # Generated TypeScript types
│   ├── core/                 # 🧠 Business logic
│   │   ├── chaos-parser/     # NairobiChaosParser
│   │   └── event-processor/  # Event ingestion & processing
│   └── integrations/         # 🔌 External APIs
│       ├── whatsapp/         # Meta WhatsApp Cloud API
│       ├── mpesa/            # Safaricom Daraja API
│       └── sms/              # SMS fallback (Africa's Talking)
│
├── clients/                   # Tenant configurations
│   ├── elixosense/           # 🏆 First client
│   │   ├── config.json       # Business-specific config
│   │   └── README.md         # Setup instructions
│   └── template/             # Template for new tenants
│
├── archive/                   # Old code (reference only)
│   ├── containerx-old/       # Previous Python backend
│   └── elixosense-old/       # Previous Next.js implementation
│
└── docs/                      # Documentation
    ├── CONTEXT.md            # 📖 Full project context
    ├── ELIXOSENSE.md         # ElixoSense requirements
    ├── ROADMAP.md            # Development roadmap
    └── adr/                  # Architecture Decision Records
```

---

## 🎯 Core Features (MVP)

### ✅ Implemented
- Multi-tenant schema + RLS
- `commerce_events` append-only log
- Explicit `orders`/`payments` tables with outstanding tracking
- WhatsApp webhook ingestion (Edge Function)
- M-Pesa STK push + callback handlers
- Offline PWA queue + sync UI

### 📋 Planned
- SMS fallback
- Daily summary (Day 8)
- Export tooling

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

- **[CONTEXT.md](docs/CONTEXT.md)** - Full project context (start here!)
- **[ELIXOSENSE.md](docs/ELIXOSENSE.md)** - First client requirements
- **[ROADMAP.md](docs/ROADMAP.md)** - Development roadmap
- **[Database README](packages/database/README.md)** - Database schema & migrations
- **[ADRs](docs/adr/)** - Architecture decisions

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
| **Frontend** | React 18 + Vite + Tailwind CSS + TypeScript |
| **PWA** | Vite PWA Plugin + Workbox |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Integrations** | Direct APIs (Meta WhatsApp, Safaricom Daraja) |
| **Hosting** | Vercel (frontend) + Supabase (backend) |
| **Language** | Swahili-first (Kenya) |

---

## 🚦 Status

**Current Phase:** Days 0–7 verified (Week 1 complete)

- ✅ Schema + core Edge Functions
- ✅ WhatsApp ingest + M-Pesa callbacks
- ✅ Offline-first merchant PWA
- 📋 Week 2: Daily summary + export + stress tests

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
# Start everything locally
cd packages/database && supabase start
cd apps/merchant && npm run dev

# Run migrations
cd packages/database && npm run migrate

# Generate types
cd packages/database && npm run types

# Deploy merchant app
cd apps/merchant && vercel deploy

# Test parser
cd packages/core && npm test

# Check database
cd packages/database && npm run studio
```

---

**Last Updated:** January 16, 2026  
**Version:** 0.1.0 (MVP Foundation)
