# Changelog

All notable changes to Kenya Commerce OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-16

### Added - Svelte 5 PWA Foundation

#### Merchant Dashboard (`apps/merchant-svelte/`)
- **3-tab interface** optimized for mobile
  - Orders page with filters (Zote, Zinasubiri, Zilipwa)
  - Messages page showing WhatsApp messages
  - Payments page with daily totals
- **Offline-first architecture**
  - IndexedDB queue for actions when offline
  - Exponential backoff sync manager (1s → 2s → 4s → 8s → 16s)
  - Max 5 retries before marking failed
  - Auto-sync when connection restored
- **Real-time updates** via Supabase subscriptions
  - Orders table changes
  - WhatsApp messages (commerce_events)
  - Payments table changes
- **Service Worker** for offline caching
  - Cache-first for static assets
  - Network-first for API calls
  - Automatic cache invalidation on version change
- **Swahili UI** throughout
  - Oda, Ujumbe, Malipo navigation
  - Zinasubiri, Zilipwa, Imelipwa status labels
  - Tuma Link, Tengeneza Oda action buttons

#### Backend (`supabase/functions/`)
- **dev-data endpoint** for testing
  - Returns sample orders, messages, payments
  - Only available in non-production environments
  - Accessible at `/functions/v1/dev-data`

#### Database
- **Test data seeded**
  - `dev-test` business for development
  - 3 sample orders (pending, partial, paid)
  - 3 sample WhatsApp messages
  - Test customers: Juma Test, Amina Test, Mwangi Test

#### Documentation
- Updated `README.md` with Svelte PWA instructions
- Created `apps/merchant-svelte/README.md` with detailed docs
- Updated tech stack to reflect Svelte 5 + SvelteKit

### Performance
- **Bundle size:** ~70KB gzipped (target: <100KB) ✅
  - Largest chunk: 45.97 KB (Supabase client)
  - Service worker: 0.67 KB
  - Per-route chunks: 10-15 KB each
- **Optimized for:**
  - Tecno/Infinix phones (2GB RAM)
  - Slow 3G networks (5s initial load target)
  - Costly data bundles
  - Spotty connectivity

### Technical Details
- **Framework:** Svelte 5.45.6 with runes
- **Build tool:** Vite 7.2.6 + SvelteKit 2.49.1
- **Adapter:** @sveltejs/adapter-static (PWA mode)
- **Database client:** @supabase/supabase-js 2.x
- **Offline storage:** idb (IndexedDB wrapper)
- **Deployment target:** Vercel (or any static host)

### Changed
- Replaced React PWA (`apps/merchant/`) with Svelte 5 PWA (`apps/merchant-svelte/`)
- Updated project structure in README
- Simplified tech stack documentation

### Fixed
- Environment variable handling for static builds
- Service worker registration for offline support
- Real-time subscription cleanup on component unmount

---

## [0.0.1] - 2026-01-09 to 2026-01-15

### Added - Foundation (Days 0-7)

#### Database Schema
- Multi-tenant architecture with `business_id` on all tables
- Immutable `commerce_events` append-only log
- Explicit `orders` and `payments` tables
- Row Level Security (RLS) policies
- Idempotency constraints (unique `mpesa_receipt`)

#### Edge Functions
- `whatsapp-webhook` - Ingests WhatsApp messages
- `mpesa-callback` - Handles M-Pesa payment callbacks
- `generate-payment-link` - Triggers STK Push

#### Testing
- Deno tests for M-Pesa callback flow
- Manual verification queries for schema
- Sandbox testing with Daraja API

#### Documentation
- SPEC.md with event types and immutability rules
- CONTEXT.md with full project context
- ADRs for key architectural decisions

---

## Roadmap

### [0.2.0] - Next Release (Planned)
- [ ] WhatsApp auto-responder bot
- [ ] `/orders/new` manual order creation flow
- [ ] Push notifications for new orders
- [ ] Vercel deployment configuration
- [ ] Production environment setup

### [0.3.0] - Future
- [ ] Daily summary view
- [ ] Data export functionality (CSV, PDF)
- [ ] SMS fallback integration (Africa's Talking)
- [ ] USSD gateway for feature phones
- [ ] Advanced analytics dashboard

---

## Notes

### Breaking Changes
- None yet (pre-1.0.0)

### Deprecations
- `apps/merchant/` (React PWA) is now legacy
  - Will be removed in v0.2.0
  - Replaced by `apps/merchant-svelte/`

### Migration Guide
No migrations needed yet. Fresh installation recommended.

---

**Last Updated:** January 16, 2026  
**Current Version:** 0.1.0
