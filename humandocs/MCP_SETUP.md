# MCP Setup (Perplexity) for this project

Goal: make “industry standard check” queries fast, repeatable, and easy to cite.

## What we use MCP for (and what we don’t)
- Use it for:
  - Checking “what’s standard” (e.g., webhook signature verification patterns, idempotency practices, RLS patterns)
  - Getting citations/links you can reference in docs/ADRs
  - Comparing approaches quickly (timeboxed)
- Don’t use it for:
  - Storing secrets
  - Deciding core architecture that contradicts locked ADRs

## Perplexity MCP: setup steps (human fill-in)
1) Enable the Perplexity MCP in Cursor settings for this workspace.
2) Add your Perplexity API key in Cursor’s secret storage (do not commit).
3) Confirm it works with a quick query like:
   - “Summarize best practices for idempotency keys in webhook handlers.”

Record confirmation:
- Date wired: `TODO`
- Verified query works: `TODO yes/no`

## Project research workflow (recommended)
1) Ask a focused question (one topic per query).
2) Capture a 5–10 line summary into `humandocs/RESEARCH_LOG.md`.
3) If it changes behavior, write/update an ADR in `elixosense-whatsapp/docs/adr/`.
4) Convert remaining work into a task.

## Safety rules
- Never paste secrets (tokens, keys, URLs with embedded credentials) into MCP queries.
- When sharing logs/error traces, redact phone numbers and tokens.

