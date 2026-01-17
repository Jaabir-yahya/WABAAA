# Human Guide / How‑Tos / Cheatsheets (Canonical)

This is the **one** place to dump operational advice, click-paths, “how do I…”, and cheat sheets.

If you’re unsure where to write something:
- **How to operate/build/run** → put it here.
- **Exact provider click-paths + what values you copied** → put it here (and mirror the “TODO clickpath” fields in `SETUP_CHECKLIST.md`).
- **Decisions/why** (architecture, security model, invariants) → `elixosense-whatsapp/docs/adr/`.
- **Short “what to do during incidents / deploys”** → `elixosense-whatsapp/docs/runbook.md`.

---

## Where things live (mental map)

### Code
- **App + API routes**: `elixosense-whatsapp/src/app/`
- **Core adapters/services**: `elixosense-whatsapp/src/lib/`
- **DB schema + migrations**: `elixosense-whatsapp/src/db/`
- **Workflow YAMLs**: `elixosense-whatsapp/src/workflows/`

### Docs (this repo)
- **Human setup + ops**: `humandocs/`
- **Runbook (MVP)**: `elixosense-whatsapp/docs/runbook.md`
- **Locked stack spec**: `elixosense-whatsapp/docs/inputs/cursor-locked-stack.md`
- **ADRs**: `elixosense-whatsapp/docs/adr/`

---

## Local dev (happy path)

From `elixosense-whatsapp/`:

1) Install deps
- `npm install`

2) Create env file
- Copy `env.example` → `.env.local`
- Fill in values

3) Apply migrations
- `npm run db:migrate`

4) Run app
- `npm run dev`
- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

---

## Environment variables (what each one is for)

**Required for local app boot**
- `DATABASE_URL`: Postgres connection string (Supabase Project Settings → Database → Connection string)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

**WhatsApp**
- `WHATSAPP_VERIFY_TOKEN`: webhook verify token (Meta console)
- `WHATSAPP_APP_SECRET`: Meta App Dashboard → Settings → Basic → App Secret (used for `X-Hub-Signature-256` verification)
- `WHATSAPP_API_TOKEN`: bearer token for sending messages
- `WHATSAPP_PHONE_NUMBER_ID`: Meta "Phone Number ID" (`phone_number_id`), used in Graph API paths like `/{phone-number-id}/messages`

**M‑Pesa / Daraja**
- `MPESA_CALLBACK_URL`: public URL for Safaricom callback (`/api/payments/mpesa-callback`)
- `SAFARICOM_API_KEY`, `SAFARICOM_API_SECRET`, `SAFARICOM_SHORTCODE`, `SAFARICOM_PASSKEY`
- `SAFARICOM_BASE_URL`: defaults to sandbox if unset

**Cron**
- `CRON_SECRET`: required by `/api/cron/reminders` via header `x-cron-secret`

**Server-only (keep, even if not used everywhere yet)**
- `SUPABASE_SERVICE_KEY`: do not expose to browser

---

## Provider setup (human-only, fill in click-paths)

This section is intentionally “human fill-in”. Add the exact click-paths for your accounts so future-you can re-do setup fast.

### MCP sanity checks (do this first to avoid “wrong project” mistakes)

If you’re using Supabase MCP in Cursor, **always** verify MCP is pointed at the same project as your `.env.local`.

- **Step 1 (MCP)**: run “get project URL”
  - Expected: it matches `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- **Step 2 (MCP)**: list tables in `public`
  - Expected: table names match what this app uses (for this repo: `tenants`, `customers`, `tickets`, `whatsapp_messages`, `payments`, `state_logs`, `scheduled_reminders`, `users`)
- **If it doesn’t match**:
  - Stop. Don’t copy keys / don’t run migrations yet.
  - Re-point the Supabase MCP connection (Cursor settings) to the intended Supabase project.

### Supabase
- Staging project name: `TODO`
- Prod project name: `TODO`

Click paths (fill in):
- `NEXT_PUBLIC_SUPABASE_URL`: `TODO clickpath`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `TODO clickpath`
- `SUPABASE_SERVICE_KEY`: `TODO clickpath`
- `DATABASE_URL`: `TODO clickpath`

Notes/gotchas:
- `TODO`

### Vercel
- Project name: `TODO`
- Preview env vars clickpath: `TODO`
- Production env vars clickpath: `TODO`

Cron:
- Route: `/api/cron/reminders`
- Header: `x-cron-secret: <CRON_SECRET>`
- Schedule: `TODO` (e.g. every 10 minutes)

Notes/gotchas:
- `TODO`

### Meta WhatsApp Cloud API
Webhook endpoint:
- `https://<your-domain>/api/whatsapp/webhook`

You must set:
- `WHATSAPP_VERIFY_TOKEN`: `TODO`
- `WHATSAPP_APP_SECRET`: `TODO`
- `WHATSAPP_API_TOKEN`: `TODO`
- `WHATSAPP_PHONE_NUMBER_ID` (phone_number_id): `TODO`

Verification checklist:
- GET verify handshake succeeds (challenge echoed)
- POST events succeed (200) and messages persist

Notes/gotchas:
- `TODO`

### Safaricom Daraja (M‑Pesa)
Callback endpoint (must be public):
- `https://<your-domain>/api/payments/mpesa-callback`

You must set:
- `SAFARICOM_API_KEY`: `TODO`
- `SAFARICOM_API_SECRET`: `TODO`
- `SAFARICOM_SHORTCODE`: `TODO`
- `SAFARICOM_PASSKEY`: `TODO`

Notes/gotchas:
- `TODO`

---

## Operational cheat sheets

### Endpoints
- **WhatsApp webhook**: `POST /api/whatsapp/webhook` (Meta POST events), `GET /api/whatsapp/webhook` (verify)
- **M‑Pesa callback**: `POST /api/payments/mpesa-callback`
- **Cron**: `POST /api/cron/reminders` with `x-cron-secret`

### Planned endpoints (not implemented yet)
- `POST /api/payments/verify` (manual payment verification)
- `GET /api/tickets`, `GET/PATCH /api/tickets/:id` (ticket CRUD for admin)

### Common commands
- `npm run dev`
- `npm run db:migrate`
- `npm run typecheck`
- `npm run test:unit`

### Release checklist (staging → prod)
- Apply migrations to staging DB, then prod DB.
- Verify WhatsApp webhook challenge + inbound ingestion in staging.
- Verify M‑Pesa sandbox flow (or manual verify path).
- Confirm `/admin` login works and the admin user has `is_admin = true` in `public.users`.
- Confirm cron endpoint is protected and running.

---

## Troubleshooting

### “Missing DATABASE_URL”
- Ensure `.env.local` exists in `elixosense-whatsapp/` and contains `DATABASE_URL=...`.

### “Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY”
- Confirm both are set in `.env.local`.
- In Vercel, confirm they exist for the correct environment (Preview vs Production).

### WhatsApp verify fails (GET)
- Confirm Meta console webhook verify token matches `WHATSAPP_VERIFY_TOKEN`.
- Confirm the URL is exactly `/api/whatsapp/webhook` (not `/webhook/` etc.).

### WhatsApp POST returns 401
- If `WHATSAPP_APP_SECRET` is set, `X-Hub-Signature-256` must be present and verify.
- If running locally without signature verification, omit `WHATSAPP_APP_SECRET`.

### Cron returns 401
- Header must be `x-cron-secret` and match `CRON_SECRET`.

