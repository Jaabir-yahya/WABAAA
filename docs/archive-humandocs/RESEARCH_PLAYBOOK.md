# Research Playbook (Perplexity-driven, timeboxed)

## Why this exists
This project is in a well-covered domain (webhooks, payments, RLS, serverless). We use Perplexity MCP to quickly align with industry standards, but we keep decisions grounded in locked ADRs.

## Rules of engagement
- Timebox: **20–30 minutes** max per research topic.
- One question per query (don’t bundle unrelated topics).
- Output must become one of:
  - ADR update/new ADR
  - an implementation task
  - or a “decision: no change” entry

## Suggested query patterns
### Webhooks & signatures
Prompt template:
“For Meta WhatsApp Cloud API, what is the correct way to verify `X-Hub-Signature-256` and what common mistakes should we avoid?”

### Idempotency (serverless)
Prompt template:
“What are best practices for idempotency in webhook handlers and payment callbacks in serverless environments? Provide concrete keying strategies.”

### Postgres RLS (Supabase)
Prompt template:
“What are best practices for admin-gated RLS policies in Supabase, and how should `security definer` functions be used safely?”

## How to record results
1) Write a short summary to `humandocs/RESEARCH_LOG.md` with:
   - date
   - question asked
   - key takeaways
   - links/citations
   - what we changed (or decided not to change)
2) If it changes architecture/behavior, update ADRs in:
   - `/Users/jaabirahmed/Documents/projects/WABAAA/elixosense-whatsapp/docs/adr/`

## Anti-waste guidance
- If research isn’t producing actionable changes within 20 minutes, stop and implement the simplest safe path consistent with ADRs.
- Prefer adding a small test to validate behavior over prolonged research.

