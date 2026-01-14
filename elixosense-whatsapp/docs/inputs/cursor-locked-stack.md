# ElixoSense Kenya WhatsApp MVP – Locked Tech Stack & Defaults
## v1.0 | For Cursor AI Code Assistant

**Project**: WhatsApp automation platform for ElixoSense Kenya  
**Scope**: MVP (8 weeks, serverless, single-tenant)  
**Last Updated**: 2026-01-14  

---

## 🔒 LOCKED DECISIONS (Don't Change These Without PM Sign-Off)

### A. Deployment Model
- **Primary**: Vercel (Next.js App Router) for all HTTP endpoints
- **Serverless**: No persistent servers
- **Region**: eu-west-1 (Ireland) for future EU compliance path
- **Cost model**: Pay-per-use, scale to zero

### B. Database & ORM
- **Primary DB**: Supabase PostgreSQL (managed, includes Auth + Storage + RLS)
  - Reason: Built-in auth, row-level security, easy serverless integration
  - Free tier: 500 MB database, ~100 concurrent connections
  - Migrate to AWS RDS later if needed (path exists)

- **Schema & Migrations**: Drizzle ORM + Drizzle Kit
  - Why: Type-safe TS schema, serverless-friendly, no connection pool overhead
  - Alternative if needed: Prisma (but watch serverless connection limits)

- **Schema location**: `/src/db/schema.ts` (single source of truth)
- **Migrations**: Stored in repo, run via CI/CD before deploy

### C. State Machine & Orchestration
- **Library**: xstate (JavaScript state machine)
  - Why: Battle-tested, visual debugging, clear state definitions
  - Alternative: Hand-rolled state machine (acceptable if xstate feels overkill)

- **Workflow definitions**: YAML files in `/src/workflows/`
  - Example: `/src/workflows/elixosense-product-inquiry.yaml`
  - Parser: Simple YAML loader + TypeScript validation (Zod schemas)

- **Event model**: Append-only `events` table in Postgres
  - No external event bus (SNS/SQS) in MVP
  - Simplification: actions dispatch immediately in-process, with retries queued to DB

### D. WhatsApp Cloud API Integration
- **Source**: Official Meta WhatsApp Cloud API (v19+)
- **Approach**: Internal helper module (no heavy SDKs)
  - Location: `/src/lib/whatsapp.ts`
  - Exports:
    - `verifyWebhookSignature(body, token)` → boolean
    - `parseInboundMessage(webhookBody)` → InternalEvent
    - `sendMessage(ticketId, template, params)` → Promise<{ id, status }>
    - `downloadMedia(mediaId)` → Promise<Buffer>

- **No external SDKs** unless:
  - Officially maintained by Meta
  - Clear production references
  - Recent commits (within 3 months)

- **Signature verification**: Use Node's `crypto.createHmac()` directly
  - Reference: Meta official docs (not blog tutorials)

### E. Payment Processing (M-Pesa)
- **Primary method**: M-Pesa STK Push (Daraja API)
  - URL: https://sandbox.safaricom.co.ke (test), production endpoint (live)
  - Credentials: Stored in `.env` (API key, API secret, shortcode, passkey)

- **Fallback method**: Manual payment code verification + screenshot NLP
  - Screenshot text extraction: Google Cloud Vision API (add to `lib/evidence.ts`)
  - Pattern matching for M-Pesa transaction codes

- **Module location**: `/src/lib/payments.ts`
- **No external payment provider** in MVP (Paystack, Stripe, etc. → Phase 2)

### F. Authentication (Admin)
- **Service**: Supabase Auth (built into Postgres plan)
  - Method: Email + password for MVP (magic links optional)
  - No OAuth providers initially

- **Session management**: Supabase client handles tokens
- **Admin check**: Simple `is_admin` flag in users table + RLS policies

### G. Scheduling & Cron
- **Primary**: Vercel Cron (built into Vercel Functions)
  - Route: `/api/cron/reminders`
  - Frequency: Every 5–15 minutes (check `scheduled_reminders` table)
  - Authentication: Internal cron secret token

- **No external scheduler** (QStash, GitHub Actions) unless Vercel Cron limits hit

### H. File / Evidence Handling
- **Storage**: Supabase Storage (S3-compatible, built into Supabase plan)
  - Bucket: `evidence` (auto-public with signed URLs for downloads)
  - Retention: 24 months default (configurable per tenant)

- **Module location**: `/src/lib/evidence.ts`
- **Exports**:
  - `saveMediaFromWhatsapp(mediaId, mimeType)` → Promise<{ url, backupDate }>
  - `linkEvidenceToTicket(ticketId, storageUrl, type)` → Promise

### I. Logging & Observability
- **Errors**: Sentry SDK (Next.js integration)
  - DSN: Set in `.env` from Sentry project
  - Captures: Unhandled exceptions, API errors, payment failures
  - Free tier: ~5k errors/month (sufficient for MVP)

- **Structured logs**: Simple console.log with JSON formatting
  - Later: Pipe to Logtail / Axiom if needed

- **No custom logging infrastructure** in MVP

### J. Admin Dashboard
- **Scope**: Single Next.js App Router route `/admin`
- **Library**: React Admin (minimal, CRUD-based)
  - Why: Fast CRUD scaffolding, works in Vercel
  - Alternative: Custom Next.js components (if team prefers)

- **Features for MVP**:
  - Tickets list (paginated, filterable by state)
  - Ticket detail: timeline + messages + actions
  - Button to change state (init → quoted → booked → paid → closed)
  - Payment verification: manual "mark as verified" button
  - Evidence viewer: image previews + download links

- **Not included**:
  - Analytics dashboards
  - Multi-user RBAC
  - Slack/ERPNext sync
  - Reporting (Phase 2)

### K. Testing Strategy
- **Unit**: Jest for functions (`lib/` modules)
- **Integration**: Vitest for API routes + DB queries
- **E2E**: Manual testing with Meta sandbox (Postman collection provided)
- **No Cypress/Playwright** in MVP

### L. Environment & Secrets
- **Local dev**: `.env.local` file (never committed; copy from `env.example`)
- **Staging**: Vercel preview deployments (auto from `develop` branch)
- **Production**: Vercel main deployment (auto from `main` branch)

- **Secrets management**:
  - Store in Vercel project settings (GUI) or `.env.production.local`
  - Key names (must match code exactly):
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_KEY`
    - `WHATSAPP_API_TOKEN`
    - `WHATSAPP_VERIFY_TOKEN`
    - `WHATSAPP_PHONE_NUMBER_ID`
    - `SAFARICOM_API_KEY`
    - `SAFARICOM_API_SECRET`
    - `SAFARICOM_SHORTCODE`
    - `SAFARICOM_PASSKEY`
    - `SENTRY_DSN`
    - `CRON_SECRET`

---

## 📁 Repo Structure (MVP)

```
elixosense-whatsapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── whatsapp/
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts          # Meta webhook endpoint
│   │   │   ├── payments/
│   │   │   │   ├── mpesa-callback/
│   │   │   │   │   └── route.ts          # M-Pesa STK callback
│   │   │   │   └── verify/
│   │   │   │       └── route.ts          # Manual payment verification
│   │   │   ├── tickets/
│   │   │   │   ├── route.ts              # List tickets (GET)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts          # Get/update ticket (GET/PATCH)
│   │   │   ├── cron/
│   │   │   │   └── reminders/
│   │   │   │       └── route.ts          # Vercel Cron job
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts          # (Supabase Auth) or (NextAuth)
│   │   ├── admin/
│   │   │   └── page.tsx                  # Admin dashboard (React Admin)
│   │   └── page.tsx                      # Landing page (optional)
│   │
│   ├── db/
│   │   ├── schema.ts                     # Drizzle schema (single source of truth)
│   │   └── migrations/                   # Drizzle migrations (SQL)
│   │
│   ├── lib/
│   │   ├── whatsapp.ts                   # WhatsApp webhook + send client
│   │   ├── payments.ts                   # M-Pesa integration
│   │   ├── evidence.ts                   # File upload + storage
│   │   ├── orchestration.ts              # State machine executor
│   │   ├── logger.ts                     # Sentry + console logging
│   │   └── db.ts                         # Drizzle client init
│   │
│   ├── workflows/
│   │   ├── elixosense-product-inquiry.yaml  # Product inquiry → payment → delivery
│   │   └── loader.ts                    # YAML workflow parser
│   │
│   ├── types/
│   │   ├── events.ts                    # Event union types
│   │   ├── ticket.ts                    # Ticket, State types
│   │   └── whatsapp.ts                  # WhatsApp payload types
│   │
│   └── utils/
│       ├── idempotency.ts               # Idempotency key helpers
│       └── validators.ts                # Zod schemas for payloads
│
├── public/
├── .env.local (gitignored)
├── env.example                           # Template for env vars
├── package.json
├── tsconfig.json
├── next.config.js
├── drizzle.config.ts
└── vercel.json
```

---

## 🚀 Build Order & Weekly Deliverables

### Week 1–2: Database & Schema
**Responsibility**: Agent Database Specialist

- [ ] Set up Supabase project
- [ ] Define Drizzle schema (`src/db/schema.ts`):
  - `tenants`, `customers`, `tickets`, `state_logs`, `payments`, `evidence`, `whatsapp_messages`, `scheduled_reminders`, `users`
- [ ] Write Drizzle migrations
- [ ] Test RLS policies (tenant isolation)
- [ ] Create `lib/db.ts` (Drizzle client init)

**Deliverable**: `src/db/schema.ts` + migrations + passing tests

---

### Week 2–3: State Machine & Orchestration
**Responsibility**: Agent State Machine Expert

- [ ] Install xstate
- [ ] Create `src/workflows/elixosense-product-inquiry.yaml` (8-state workflow)
- [ ] Write `src/workflows/loader.ts` (parse YAML → xstate machine)
- [ ] Write `src/lib/orchestration.ts`:
  - `handleEvent(ticket, event)` → new state + actions
  - `runActions(actions)` → dispatch side-effects (send message, schedule reminder, etc.)
- [ ] Write unit tests (mocked events)

**Deliverable**: Working state machine, load YAML, transition tickets on mocked events

---

### Week 3–4: WhatsApp Gateway
**Responsibility**: Agent WhatsApp Specialist

- [ ] Create `src/lib/whatsapp.ts`:
  - `verifyWebhookSignature()`
  - `parseInboundMessage()` → InternalEvent
  - `sendMessage()` → call Meta API
  - `downloadMedia()` → buffer from Meta
- [ ] Create `src/app/api/whatsapp/webhook/route.ts`:
  - Verify signature
  - Parse message
  - Emit event to orchestration
  - Return 200 immediately
- [ ] Write Zod schemas for webhook payloads
- [ ] Test with Meta sandbox (Postman collection)

**Deliverable**: Webhook receives messages, parses correctly, sends ack within 100ms

---

### Week 4–5: Payment Processing
**Responsibility**: Agent Payment Expert

- [ ] Create `src/lib/payments.ts`:
  - `requestPayment(ticketId, amount)` → STK Push or manual instruction
  - `verifyPayment(ticketId, paymentCode)` → API check or screenshot NLP
  - `handleMpesaCallback()` → process STK response
  - Screenshot text extraction (Google Vision API)
- [ ] Create `src/app/api/payments/mpesa-callback/route.ts`
- [ ] Create `src/app/api/payments/verify/route.ts` (manual verification endpoint)
- [ ] Unit tests + Safaricom sandbox tests

**Deliverable**: M-Pesa STK working, callback processed, screenshot NLP extracts codes

---

### Week 5–6: Evidence & Observability
**Responsibility**: Agent DevOps (Infrastructure)

- [ ] Create `src/lib/evidence.ts`:
  - Download + backup media to Supabase Storage
  - Link evidence to ticket
  - Soft-delete with retention policy
- [ ] Add Sentry SDK to Next.js (`next.config.js`)
- [ ] Create `src/lib/logger.ts` (wrapper around Sentry)
- [ ] Set up Vercel Cron: `/api/cron/reminders`
- [ ] Infrastructure as Code (optional: `vercel.json` config)

**Deliverable**: Media backs up to storage, errors captured in Sentry, cron job runs

---

### Week 6–7: Admin Dashboard
**Responsibility**: Agent (Any) or PM

- [ ] Set up React Admin in `/src/app/admin`
- [ ] Implement data provider (points to your API routes)
- [ ] Views:
  - Tickets list (GET `/api/tickets`)
  - Ticket detail (GET `/api/tickets/[id]`)
  - Actions: Change state (PATCH `/api/tickets/[id]`)
- [ ] Authentication check (Supabase Auth)

**Deliverable**: Admin can see tickets, change state, view messages

---

### Week 7–8: Integration & Testing
**Responsibility**: PM + All Agents

- [ ] Wire all modules together
- [ ] End-to-end test (inquiry → payment → completion)
- [ ] Error scenarios (API down, payment fails, etc.)
- [ ] Staging deployment (Vercel preview)
- [ ] Live testing with ElixoSense (real WhatsApp, test M-Pesa)
- [ ] Production deployment

**Deliverable**: Full workflow working, ready for live use

---

## ✅ Checklist: What Adapters Must Exist

These are the **5 core adapter modules** agents must create (and PM/Cursor will use):

1. **`lib/whatsapp.ts`** — All Meta API calls go here
   - Signature verification
   - Inbound parsing
   - Outbound send
   - Media download

2. **`lib/payments.ts`** — All payment logic
   - STK Push request
   - API verification
   - Screenshot NLP
   - Callback handling

3. **`lib/evidence.ts`** — All file handling
   - Upload to Supabase Storage
   - Link to ticket
   - Soft-delete

4. **`lib/orchestration.ts`** — State machine executor
   - Load workflow
   - Handle event
   - Emit actions
   - Run side-effects

5. **`lib/logger.ts`** — All observability
   - Sentry integration
   - Structured logging
   - Error capture

---

## 🎯 Key Rules for Cursor & Agents

### Rule 1: Adapters First
Before writing any API route, create the adapter it will call.  
Don't call Meta API, M-Pesa, or DB directly from routes — route → adapter → service.

### Rule 2: No External Event Bus (MVP)
Don't add SQS, SNS, or external queue.  
Queue failures to DB, retry from cron.

### Rule 3: Type Safety
All events, payloads, and DB queries must have Zod schemas or TypeScript types.  
`parseInboundMessage()` must return a known event type or throw.

### Rule 4: Idempotency
Every external API call must be idempotent.  
Store `idempotency_key` in DB; don't re-send the same message twice.

### Rule 5: Audit Trail
Every state change, payment, or action is logged to `state_logs` table.  
Queries can never delete; only soft-delete.

### Rule 6: One Tenant
MVP is single-tenant (one ElixoSense business).  
Add `tenant_id` scoping in all queries for future migration.

---

## 📊 Definition of Done (Week 8)

- [ ] Ticket created → Quote → Payment → Completion (full E2E flow)
- [ ] M-Pesa STK Push works with Safaricom test credentials
- [ ] All messages and state changes logged to PostgreSQL
- [ ] Admin dashboard shows tickets, messages, payment status
- [ ] Dispute export (PDF with full audit trail) works
- [ ] Sentry captures all errors
- [ ] Vercel Cron job sends reminders every 5–15 min
- [ ] Deployed to Vercel production
- [ ] ElixoSense can use it for 1 week without critical issues

---

## ⚠️ Known Limitations (Phase 2+)

- **No multi-user**: Only one business owner can access
- **No AI-driven flows**: All workflows are rule-based (xstate)
- **No integrations**: No ERPNext, Slack, or other systems
- **No analytics**: No BI dashboards (Phase 2)
- **No mobile app**: Web dashboard only
- **Single payment method**: M-Pesa only (Pesapal, Stripe in Phase 2)

---

## 🔗 Key Official References (Verify Before Coding)

- **Meta WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Supabase Docs**: https://supabase.com/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **xstate Docs**: https://stately.ai/docs
- **Next.js App Router**: https://nextjs.org/docs/app
- **Vercel Cron**: https://vercel.com/docs/cron-jobs
- **Sentry Next.js**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## 🎬 How Cursor Should Use This

1. **On startup**, read this document fully
2. **For each route/module**, check the Repo Structure section for where it lives
3. **Before calling external services** (Meta, M-Pesa, Supabase), use the adapter modules
4. **Every state change** → append to `state_logs` table
5. **Every error** → log to Sentry via `lib/logger.ts`
6. **Defaults are locked** — ask PM before deviating

---

**Last Updated**: 2026-01-14  
**Locked By**: PM  
**Status**: Ready for agent handoff  
