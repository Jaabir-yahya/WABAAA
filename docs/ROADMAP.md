# Kenya Commerce OS - Development Roadmap

## 🎯 Current Status: Post-Pivot Restructure
**Date**: January 16, 2026  
**Phase**: Setting up unified architecture

---

## Phase 0: Foundation Setup (Week 1)

### Infrastructure ✅
- [x] Create new monorepo structure
- [x] Archive old code (containerx, elixosense-old)
- [x] Set up documentation
- [ ] Initialize Supabase project
- [ ] Set up Vercel deployment
- [ ] Configure domain/DNS

### Database Schema
- [ ] Create `commerce_events` table (core)
- [ ] Create `businesses` table (tenants)
- [ ] Create materialized views (orders, payments, customers)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create seed data for ElixoSense

### Development Environment
- [ ] Package.json and TypeScript configs
- [ ] ESLint + Prettier setup
- [ ] Git hooks (pre-commit, pre-push)
- [ ] Environment variables template
- [ ] Local development guide

---

## Phase 1: Core Platform (Weeks 2-3)

### NairobiChaosParser
- [ ] Basic message parsing (Swahili + English)
- [ ] Product extraction ("2 kg sukari")
- [ ] Contact info extraction (phone, location)
- [ ] Payment amount extraction
- [ ] Unit tests (100+ example messages)

### Event Processing
- [ ] Event ingestion pipeline
- [ ] Event validation
- [ ] View materialization (orders, payments)
- [ ] Conflict resolution
- [ ] Error handling

### Integrations
- [ ] WhatsApp Cloud API client
- [ ] Webhook handler (GET verify + POST messages)
- [ ] Signature verification
- [ ] M-Pesa Daraja client
- [ ] STK Push implementation
- [ ] Callback handler
- [ ] SMS fallback skeleton

---

## Phase 2: Merchant Dashboard (Weeks 3-4)

### React PWA Setup
- [ ] Vite + React + TypeScript
- [ ] Tailwind CSS configuration
- [ ] PWA manifest + service worker
- [ ] Supabase client integration
- [ ] Offline detection + queue

### Core Components (Swahili UI)
- [ ] Dashboard layout (`DashboardYaBiashara`)
- [ ] Today's summary (`MukhtasariWaLeo`)
- [ ] Orders list (`OrodhaYaOda`)
- [ ] Order detail (`MaeleshoYaOda`)
- [ ] Customer profile (`WasikiriajiMteja`)
- [ ] Payment request (`OmbiLaMalipo`)

### Features
- [ ] View today's orders
- [ ] View pending payments
- [ ] Send payment request (STK Push)
- [ ] Mark order as fulfilled
- [ ] Search customers
- [ ] Offline mode (IndexedDB cache)

---

## Phase 3: ElixoSense Integration (Week 5)

### Tenant Configuration
- [ ] Create ElixoSense config file
- [ ] Set up WhatsApp webhook
- [ ] Set up M-Pesa callback
- [ ] Configure business rules
- [ ] Import initial products

### E-Commerce Sync
- [ ] Product catalog sync (one-time)
- [ ] Inventory webhook (optional)
- [ ] Order webhook to website
- [ ] Test end-to-end flow

### Testing with Real Data
- [ ] Test WhatsApp message flow
- [ ] Test M-Pesa payment flow
- [ ] Test offline mode
- [ ] Test SMS fallback
- [ ] Load testing (100 concurrent orders)

---

## Phase 4: Launch Prep (Week 6)

### Documentation
- [ ] User guide (Swahili)
- [ ] Admin guide
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] FAQ

### Monitoring & Alerts
- [ ] Supabase logs monitoring
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Payment failure alerts
- [ ] WhatsApp downtime alerts

### Security
- [ ] Security audit
- [ ] Rate limiting
- [ ] Input validation
- [ ] API key rotation
- [ ] Backup strategy

### Launch
- [ ] Production deployment
- [ ] Domain configuration
- [ ] SSL certificates
- [ ] ElixoSense onboarding
- [ ] First order processed! 🎉

---

## Phase 5: Post-Launch (Month 2)

### Stability & Refinement
- [ ] Monitor error rates
- [ ] Fix critical bugs
- [ ] Performance optimization
- [ ] User feedback incorporation
- [ ] Parser improvements

### ElixoSense Features
- [ ] Customer catalog (WhatsApp mini-site)
- [ ] Loyalty points system
- [ ] Basic analytics dashboard
- [ ] Inventory tracking
- [ ] Multi-user support (add staff)

---

## Phase 6: Scale (Months 3-6)

### Platform Enhancements
- [ ] Advanced parser (ML model)
- [ ] Voice orders (Swahili speech-to-text)
- [ ] USSD integration
- [ ] Bulk operations
- [ ] Advanced reporting

### New Merchants
- [ ] Tenant #2 onboarding
- [ ] Tenant #3 onboarding
- [ ] Self-service signup
- [ ] Tenant admin panel
- [ ] Billing system

### Ecosystem
- [ ] API for developers
- [ ] Webhooks for tenants
- [ ] Plugin system
- [ ] Integration marketplace
- [ ] Community forum

---

## Success Milestones

### 🎯 MVP Success (Week 6)
- ElixoSense processes 100% of orders via platform
- 90%+ M-Pesa payments auto-linked
- Owner prefers platform over spreadsheets
- Zero data loss incidents

### 🚀 Launch Success (Month 2)
- 500+ orders processed
- <1% error rate
- 99.9% uptime
- Positive user feedback

### 💼 Scale Success (Month 6)
- 5+ active merchants
- 5000+ orders processed
- $10k+ GMV (Gross Merchandise Value)
- Self-sustaining (revenue > costs)

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| WhatsApp API changes | High | Version pinning, monitoring changelog |
| M-Pesa downtime | High | Manual payment verification fallback |
| Supabase outage | Medium | Database backups, status monitoring |
| Parser accuracy | Medium | Human-in-loop for ambiguous cases |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| ElixoSense stops using | High | Close collaboration, feedback loops |
| Regulatory issues | Medium | Legal review, compliance checks |
| Competition | Low | Focus on Kenyan market specifics |

---

## Decision Log

See `docs/adr/` for Architecture Decision Records on major technical decisions.

---

## Notes

### What We're NOT Building (MVP)
- ❌ Mobile apps (PWA is sufficient)
- ❌ Complex inventory management
- ❌ Advanced analytics/BI
- ❌ White-label customization
- ❌ External API (Phase 6)

### Tech Debt to Address Later
- Parser ML model (currently rule-based)
- Real-time collaboration
- Advanced permissions
- Audit log UI
- Data export tools

---

**Last Updated**: January 16, 2026  
**Next Review**: Weekly during active development
