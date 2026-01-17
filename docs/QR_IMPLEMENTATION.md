# QR Implementation

This document describes the QR system used to connect physical commerce to WhatsApp and M-Pesa flows.

## QR Types

- Product QR: sticker per item, redirects to WhatsApp order message
- Invoice QR: payment reminder QR for a specific order
- Shop QR: opens WhatsApp chat for discovery
- Menu QR: opens menu in WhatsApp for restaurants

## QR Routing Architecture

```mermaid
flowchart TB
  productQR["ProductQR"]
  invoiceQR["InvoiceQR"]
  shopQR["ShopQR"]
  menuQR["MenuQR"]

  qrProcessor["qr-processor"]
  routeAction["RouteAction"]
  whatsapp["WhatsApp"]
  sms["SMSFallback"]

  productQR --> qrProcessor
  invoiceQR --> qrProcessor
  shopQR --> qrProcessor
  menuQR --> qrProcessor
  qrProcessor --> routeAction
  routeAction --> whatsapp
  routeAction --> sms
```

## QR Scan Flow

```mermaid
sequenceDiagram
  participant customer as Customer
  participant qr as QRCode
  participant processor as QRProcessor
  participant whatsapp as WhatsApp

  customer->>qr: Scan
  qr->>processor: GET /qr/:business/:action/:data
  processor->>whatsapp: RedirectWithPrefill
```

## M-Pesa QR Metadata Strategy

```mermaid
flowchart LR
  metadata["KCOS:Base64Metadata"]
  callback["MpesaCallback"]
  decode["DecodeMetadata"]
  order["CreatePaidOrder"]
  payment["InsertPayment"]

  metadata --> callback
  callback --> decode --> order --> payment
```

## QR Analytics

- `qr_scan` events stored in `commerce_events` (note_type = qr_scan)
- `qr_conversion` events stored in `commerce_events` (note_type = qr_conversion)
- Analytics dashboard aggregates scans, conversions, and revenue

## URL Format

```
{SUPABASE_URL}/functions/v1/qr-processor/qr/{businessId}/{action}/{data}
```

Actions:
- `order`: `{productId}:{quantity}:{unit}`
- `pay`: `{orderId}:{amount}`
- `chat`: `welcome`
- `menu`: `main`

## Security Notes

- QR functions should be deployed with `verify_jwt=false`
- Business validation is enforced in QR processor
- Data writes are logged in `commerce_events`

