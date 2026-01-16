# GitHub Copilot Instructions for WABAAA

## Project Overview

This is the ElixoSense Kenya WhatsApp MVP - a WhatsApp-first conversational commerce and support platform built with a serverless architecture.

**Core capabilities:**
- Meta WhatsApp Cloud API webhook ingestion and outbound messaging
- xstate-driven workflow engine with YAML-defined workflows
- Supabase Postgres with Drizzle ORM for data persistence
- M-Pesa Daraja (STK Push) payment integration
- Evidence storage in Supabase Storage
- Admin dashboard using React Admin

## Locked Tech Stack (DO NOT CHANGE)

**Important:** The following stack decisions are locked and require PM sign-off to change:

- **Deployment:** Vercel, Next.js App Router (serverless), target region `eu-west-1`
- **Database:** Supabase PostgreSQL with Auth + Storage + RLS
- **ORM/Migrations:** Drizzle ORM + Drizzle Kit (single source of truth: `src/db/schema.ts`)
- **State Machine:** xstate with YAML workflow definitions in `src/workflows/`
- **Observability:** Sentry for error tracking
- **Scheduling:** Vercel Cron (`/api/cron/reminders`) guarded by `CRON_SECRET`
- **Admin UI:** React Admin under `/admin`

## Code Organization

```
elixosense-whatsapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (webhooks, payments, tickets, cron)
│   │   └── admin/             # Admin dashboard
│   ├── db/                    # Database schema and migrations
│   │   ├── schema.ts          # Drizzle schema (single source of truth)
│   │   └── migrations/        # SQL migrations
│   ├── lib/                   # Core adapter modules
│   │   ├── whatsapp.ts        # WhatsApp Cloud API integration
│   │   ├── payments.ts        # M-Pesa integration
│   │   ├── evidence.ts        # File storage handling
│   │   ├── orchestration.ts   # State machine executor
│   │   └── logger.ts          # Sentry + structured logging
│   ├── workflows/             # YAML workflow definitions
│   └── types/                 # TypeScript types and Zod schemas
```

## Architecture Principles

### 1. Adapter Pattern
Always use adapter modules in `src/lib/` - never call external APIs directly from routes:
- Routes → Adapters → External Services
- Example: WhatsApp routes call `lib/whatsapp.ts`, not Meta API directly

### 2. Idempotency is Mandatory
- Every external API call must be idempotent
- Store `idempotency_key` in database
- Never send the same message or process the same payment twice
- Webhooks/callbacks may be retried and arrive out-of-order

### 3. Audit Trail Required
- Every state change, payment, or action must be logged to `state_logs` table
- Never delete data - only soft-delete
- Append-only event model for compliance and dispute resolution

### 4. Serverless-First Design
- No persistent processes or long-lived connections
- Design for stateless, scale-to-zero execution
- Queue failures to DB, retry from cron (no external queues in MVP)

### 5. Type Safety
- All events, payloads, and DB queries must have Zod schemas or TypeScript types
- Functions should validate input and return typed results or throw errors
- Use strict TypeScript configuration

### 6. Single Tenant (for now)
- MVP is single-tenant (ElixoSense only)
- However, include `tenant_id` scoping in queries for future multi-tenant migration

## Development Commands

```bash
# Development
npm run dev                    # Start development server (localhost:3000)

# Database
npm run db:migrate             # Apply Drizzle migrations to DATABASE_URL

# Code Quality
npm run lint                   # Run ESLint
npm run typecheck              # Run TypeScript compiler checks

# Testing
npm run test:unit              # Run Jest unit tests
npm run test:integration       # Run Vitest integration tests

# Build
npm run build                  # Production build
npm run start                  # Run production build locally
```

## Testing Strategy

- **Unit tests:** Jest for `lib/` modules (adapters and utilities)
- **Integration tests:** Vitest for API routes + DB queries
- **E2E tests:** Manual testing with Meta sandbox (Postman collection provided)
- No Cypress/Playwright in MVP

## Environment Variables

Required environment variables (never commit these):

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY

# WhatsApp Cloud API
WHATSAPP_API_TOKEN
WHATSAPP_VERIFY_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_APP_SECRET

# M-Pesa Daraja
SAFARICOM_API_KEY
SAFARICOM_API_SECRET
SAFARICOM_SHORTCODE
SAFARICOM_PASSKEY

# Observability
SENTRY_DSN

# Cron
CRON_SECRET

# Database
DATABASE_URL                   # Postgres connection string
```

Copy `env.example` to `.env.local` for local development.

## Key Patterns and Conventions

### State Machine Workflows
- Workflows defined in YAML under `src/workflows/`
- Loaded and executed by xstate via `lib/orchestration.ts`
- Each workflow defines states, transitions, and actions
- Actions dispatch side-effects (send message, request payment, schedule reminder)

### API Route Structure
- Use Next.js App Router conventions (`route.ts` files)
- Validate signatures/tokens for webhooks (WhatsApp, M-Pesa)
- Return responses within 100ms for webhooks (process async if needed)
- Handle errors gracefully and log to Sentry

### Database Access
- Use Drizzle ORM for all database operations
- Schema is the single source of truth (`src/db/schema.ts`)
- Migrations are SQL files in `src/db/migrations/`
- Apply Row Level Security (RLS) policies for admin access control

### Payment Processing
- Primary: M-Pesa STK Push via Daraja API
- Fallback: Manual verification with screenshot NLP (Google Cloud Vision)
- All payment state changes must be logged
- Callback endpoint: `/api/payments/mpesa-callback`

### Evidence/Media Handling
- Store in Supabase Storage (S3-compatible)
- Bucket: `evidence` with signed URLs for downloads
- Retention: 24 months default
- Link evidence to tickets in database

### Logging and Observability
- Use `lib/logger.ts` wrapper for all logging
- Errors automatically captured by Sentry
- Structured console.log with JSON formatting
- No custom logging infrastructure in MVP

## MVP Non-Goals

The following are explicitly **out of scope** for MVP:

- Multi-user RBAC (only `is_admin` flag)
- Multi-tenant support (single tenant: ElixoSense)
- External event buses (SNS/SQS) - use DB + cron instead
- Analytics/BI dashboards
- Integrations with ERPNext, Slack, or other systems
- OAuth providers (email/password only)
- Mobile app (web dashboard only)
- Multiple payment methods (M-Pesa only)

## Security Best Practices

1. **Webhook Verification:** Always verify webhook signatures (`X-Hub-Signature-256` for WhatsApp)
2. **RLS Policies:** Use Supabase RLS to enforce admin-only data access
3. **Secrets Management:** Store in Vercel project settings, never commit
4. **Input Validation:** Use Zod schemas to validate all external inputs
5. **SQL Injection:** Use Drizzle ORM parameterized queries, never concatenate SQL
6. **XSS Protection:** Sanitize user inputs in admin dashboard

## Common Gotchas

1. **Serverless Concurrency:** Handlers can overlap - use DB constraints and idempotency keys
2. **Webhooks Retry:** Meta and Safaricom may retry webhooks - always check idempotency
3. **Connection Limits:** Supabase free tier has ~100 concurrent connections - use connection pooling
4. **Vercel Timeouts:** Serverless functions have 10s timeout on hobby plan - return quickly from webhooks
5. **Environment Variables:** Both browser and server Supabase keys needed - check `.env.local`

## Documentation References

- **Project Context:** `humandocs/PROJECT_CONTEXT.md`
- **Locked Stack:** `elixosense-whatsapp/docs/inputs/cursor-locked-stack.md`
- **ADRs:** `elixosense-whatsapp/docs/adr/`
- **Runbook:** `elixosense-whatsapp/docs/runbook.md`
- **Human Guide:** `humandocs/HUMAN_GUIDE.md`

## Code Review Checklist

Before submitting code, ensure:

- [ ] Follows adapter pattern (route → lib → external service)
- [ ] Includes proper error handling and Sentry logging
- [ ] Has TypeScript types and/or Zod schemas
- [ ] Implements idempotency for external API calls
- [ ] Logs state changes to `state_logs` table
- [ ] Includes unit tests for new utility functions
- [ ] Validates all external inputs
- [ ] Uses environment variables for secrets
- [ ] Follows existing code style and conventions
- [ ] Documentation updated if needed

## Getting Help

- Check existing ADRs for architecture decisions
- Review similar patterns in existing `lib/` modules
- Consult the locked stack document before changing dependencies
- Test with Meta sandbox and Safaricom test credentials
- Use Sentry dashboard to debug production issues
