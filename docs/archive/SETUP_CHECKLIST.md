# Setup Checklist (solo dev) + Definition of Primed

This is the one place to keep **exactly how you set up** Supabase/Vercel/Meta/Daraja for *this* project (click paths, where you copied values from, gotchas).

## Quickstart (local)
From:
`/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp`

1) Install deps
- `npm install`

2) Create env file
- Copy `env.example` → `.env.local`
- Fill in values (see sections below)

3) Apply DB migrations
- `npm run db:migrate`

4) Run app
- `npm run dev`
- Open `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

## Definition of “Primed” (done)
- `npm install` succeeds.
- `env.example` exists and you created `.env.local`.
- `npm run db:migrate` succeeds against your target DB.
- `npm run dev` boots, `/admin/login` renders.
- WhatsApp webhook verify (GET) works in staging/prod.
- M-Pesa callback endpoint is publicly reachable in staging/prod.
- Cron endpoint rejects requests without `x-cron-secret` and works with it.

## Responsibility split (agent vs you)
### Agent (Cursor) will keep up-to-date
- `env.example` keys list and descriptions
- Local migration runner + docs for it
- README/runbook “happy path”

### You (human) must provide / maintain
- Real secret values (never commit)
- Where-to-click instructions for your exact provider accounts
- Any account-specific quirks (regional settings, phone numbers, approvals)

## Supabase setup (human fill-in)
Project(s):
- Staging Supabase project name: `TODO`
- Prod Supabase project name: `TODO`

Where to find values (write the exact click path):
- `NEXT_PUBLIC_SUPABASE_URL`: `TODO clickpath`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `TODO clickpath`
- `SUPABASE_SERVICE_KEY`: `TODO clickpath` (server-only)
- `DATABASE_URL`: `TODO clickpath` (connection string)

Notes/gotchas:
- `TODO`

## Vercel setup (human fill-in)
Project name: `TODO`

Where to set env vars:
- Preview env: `TODO clickpath`
- Production env: `TODO clickpath`

Cron configuration:
- Route: `/api/cron/reminders`
- Header required: `x-cron-secret: <CRON_SECRET>`
- Schedule: `TODO` (e.g. every 10 minutes)

Notes/gotchas:
- `TODO`

## Meta WhatsApp Cloud API setup (human fill-in)
Webhook endpoint:
- Verify + ingest URL: `https://<your-domain>/api/whatsapp/webhook`

You must set:
- `WHATSAPP_VERIFY_TOKEN`: `TODO`
- `WHATSAPP_APP_SECRET`: `TODO`
- `WHATSAPP_API_TOKEN`: `TODO`
- `WHATSAPP_PHONE_NUMBER_ID`: `TODO` (Meta "Phone Number ID" / `phone_number_id`)

Verification checklist:
- GET handshake succeeds (Meta “challenge” returns 200 + challenge string)
- POST signature verification uses `X-Hub-Signature-256`

Notes/gotchas:
- `TODO`

## Safaricom Daraja (M-Pesa) setup (human fill-in)
Callback endpoint (must be public):
- `MPESA_CALLBACK_URL`: `https://<your-domain>/api/payments/mpesa-callback`

You must set:
- `SAFARICOM_API_KEY`: `TODO`
- `SAFARICOM_API_SECRET`: `TODO`
- `SAFARICOM_SHORTCODE`: `TODO`
- `SAFARICOM_PASSKEY`: `TODO`
- Optional: `SAFARICOM_BASE_URL` (defaults to sandbox)

Notes/gotchas:
- `TODO`

