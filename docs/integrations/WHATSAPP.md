# WhatsApp Integration

This document describes WhatsApp Cloud API setup and webhook handling.

## Required Secrets

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Webhook Verification Flow

```mermaid
sequenceDiagram
  participant meta as Meta
  participant webhook as WAWebhook

  meta->>webhook: GET verify
  webhook-->>meta: 200 with challenge
  meta->>webhook: POST message
  webhook-->>meta: 200 ok
```

## Message Processing Flow

```mermaid
flowchart TB
  inbound["InboundMessage"]
  validate["ValidatePayload"]
  parse["ParseMessage"]
  order["CreateOrder"]
  reply["SendReply"]

  inbound --> validate --> parse --> order --> reply
```

## Operational Notes

- Only `text` messages are currently processed.
- Rate limiting and auto-response cooldown are enforced.
- All messages are logged in `commerce_events`.

