# ADR-0004: Security model (Supabase Auth + admin gating + RLS)

## Context
The MVP includes an admin dashboard and stores sensitive operational data (customer phone numbers, order/payment status, evidence uploads). We need a security model that is simple, auditable, and compatible with serverless.

## Decision
- **Authentication**: Use **Supabase Auth** only for MVP (email + password). No OAuth providers initially.
- **Authorization**:
  - Maintain an application `users` table that maps to Supabase users and includes an `is_admin` boolean.
  - Gate admin UI and admin API routes by verifying the authenticated Supabase user and requiring `is_admin = true`.
- **Row Level Security (RLS)**:
  - Enable RLS on MVP tables.
  - Use policies that restrict access to authenticated admin users for operational data.
  - Keep `tenant_id` columns in place for future multi-tenant evolution, but MVP is single-tenant.
- **Secrets**:
  - Store secrets in Vercel project settings; keep `.env.local` uncommitted.
  - Use `SUPABASE_SERVICE_KEY` only on server-side routes/adapters.

## Status
Accepted

## Consequences
- Fast MVP delivery with a single auth system and clean DB-enforced controls.
- RLS policy design becomes critical; tests should cover “admin can” and “non-admin cannot.”
- Future multi-user RBAC is deferred (Phase 2).

## Alternatives considered
- Auth.js/NextAuth: rejected for MVP (Supabase Auth is already included and simpler here).
- No RLS, app-only authorization: rejected (we want DB-enforced controls).

