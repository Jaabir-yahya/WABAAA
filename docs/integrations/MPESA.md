# M-Pesa Integration

This document describes STK Push initiation and callback handling.

## Required Secrets

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`

## STK Push Flow

```mermaid
sequenceDiagram
  participant app as EdgeFunction
  participant mpesa as MPesa
  participant customer as Customer

  app->>mpesa: InitiateSTKPush
  mpesa->>customer: PromptForPIN
  customer->>mpesa: ConfirmPayment
  mpesa->>app: Callback
```

## Callback Processing

```mermaid
flowchart TB
  callback["MpesaCallback"]
  verify["VerifySignature"]
  log["InsertEvent"]
  apply["ApplyPayment"]

  callback --> verify --> log --> apply
```

## Operational Notes

- Callback idempotency is enforced by `mpesa_receipt`.
- Payments are applied to outstanding balances in `orders`.

