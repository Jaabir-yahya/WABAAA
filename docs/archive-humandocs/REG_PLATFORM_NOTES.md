# Reg/Platform Notes (Kenya)

Purpose: track platform terms, regulatory obligations, and compliance checkpoints. Keep this short, current, and actionable.

## Data Protection Act (DPA 2019 + 2024 updates)
- Role: data controller/processor when storing customer names, phone numbers, transactions.
- Required: privacy policy, lawful basis (consent/contract), and data rights (view/export/delete).
- Threshold: ODPC registration required for systematic processing (see ODPC MSME guidance).
- TODO links/click-paths:
  - ODPC registration portal: TODO
  - Privacy policy template: TODO

## eTIMS (KRA)
- By 2025: all businesses must onboard eTIMS; expense deductibility depends on eTIMS invoices.
- Roadmap: emit eTIMS-ready invoices or integrate with KRA simplified eTIMS tooling.
- TODO links/click-paths:
  - KRA eTIMS portal: TODO
  - KRA product/service code mapping: TODO

## M-Pesa Daraja (Safaricom)
- Contract/ToS must be reviewed and accepted.
- Callback handling must be idempotent and dispute-grade.
- TODO links/click-paths:
  - Daraja portal + API keys: TODO
  - Safaricom terms references: TODO

## Meta WhatsApp Cloud API
- Template compliance, opt-in/opt-out, and DND hours are required to avoid bans.
- Maintain message quality metrics and delivery failure monitoring.
- TODO links/click-paths:
  - Meta app settings (verify token, app secret): TODO
  - WhatsApp policy references: TODO

## Consumer Protection (ICTA 2021 / e-commerce)
- Refund policy and dispute resolution must be explicit.
- Maintain moderation logs to avoid prohibited content.
- TODO links/click-paths:
  - Consumer protection references: TODO

## Recordkeeping & Audits
- Keep immutable logs for payments, state transitions, and message sends.
- Retention policy must support dispute resolution (6+ months).
