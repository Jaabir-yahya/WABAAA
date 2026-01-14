## Runbook (MVP)

### Environments
- **Local**: `.env.local` (copy from `env.example`)
- **Staging**: Vercel previews from `develop`
- **Production**: Vercel deployment from `main`

### Database migrations
- Planned: migrations will live in `src/db/migrations/` once Drizzle schema/migrations are implemented.

### Webhooks
- **WhatsApp**: `/api/whatsapp/webhook`
- **M-Pesa callback**: `/api/payments/mpesa-callback` (must be publicly reachable)

### Cron
- **Vercel Cron** should POST to `/api/cron/reminders` with header `x-cron-secret: $CRON_SECRET`.

### Release checklist (staging → prod)
- If schema/migrations exist: apply migrations to staging DB, then prod DB.
- Verify WhatsApp webhook challenge + inbound ingestion in staging.
- Verify M-Pesa sandbox flow (or use manual verification path once implemented).
- Confirm `/admin` login works and the admin user has `is_admin = true` in `public.users`.
- Confirm cron endpoint is protected and running.
