## ElixoSense WhatsApp MVP (Kenya)

WhatsApp-first conversational commerce MVP for **ElixoSense Kenya**:
- Meta **WhatsApp Cloud API** webhook ingestion + outbound messaging
- **xstate** workflow engine driven by YAML workflows
- **Supabase Postgres** + **Drizzle** schema/migrations with an append-only audit trail
- **M-Pesa Daraja (STK Push)** + manual verification fallback
- Evidence storage in **Supabase Storage**
- Admin dashboard at `/admin` using **React Admin**

### Locked stack / “build-to-spec” rules
- **Stack defaults**: `docs/inputs/cursor-locked-stack.md`
- **Architecture decisions (ADRs)**: `docs/adr/`

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Environment variables
Copy `env.example` → `.env.local` and fill in secrets.
You will also need a Postgres connection string in `DATABASE_URL` (Supabase provides one in project settings).

### Scripts
- `npm run dev`: local dev
- `npm run db:migrate`: apply Drizzle SQL migrations to `DATABASE_URL`
- `npm run build`: production build
- `npm run start`: run production build locally
- `npm run lint`: lint

### Notes
This repo is intentionally designed to stay **spec-controlled**: workflows in YAML, adapters for external systems, append-only audit logs, and lightweight ADRs for major decisions.

### Human guide / cheatsheets
See `humandocs/HUMAN_GUIDE.md` (canonical place for how-tos and operational notes).
