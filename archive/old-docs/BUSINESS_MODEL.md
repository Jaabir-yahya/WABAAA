# Kenya Commerce OS Business Model

This document maps Nairobi commerce realities to system capabilities. The goal is to make merchants successful on WhatsApp and M-Pesa with minimal friction.

## Target Merchants

- Mini-supermarkets (Kamau profile)
- Restaurants and small eateries
- Boutiques and fashion resellers (future)
- Jua Kali services (future)
- Electronics shops (future)

## Channel Strategy

- Primary: WhatsApp order intake and confirmations
- Payments: M-Pesa STK Push + callback reconciliation
- Secondary: SMS fallback for customers without WhatsApp
- Merchant view: PWA dashboard (offline-first)

## Customer Journey by Business Type

```mermaid
flowchart LR
  discover["DiscoverMerchant"]
  message["SendMessage"]
  parse["ParseOrder"]
  confirm["OrderConfirmation"]
  pay["MPesaPayment"]
  deliver["Fulfillment"]
  support["AfterSalesSupport"]

  discover --> message --> parse --> confirm --> pay --> deliver --> support
```

## Merchant Daily Workflow

```mermaid
sequenceDiagram
  participant merchant as Merchant
  participant whatsapp as WhatsApp
  participant pwa as MerchantPWA
  participant mpesa as MPesa

  merchant->>whatsapp: ReceiveOrders
  whatsapp-->>merchant: AutoRepliesSent
  mpesa-->>merchant: PaymentNotifications
  merchant->>pwa: CheckDashboard
  pwa-->>merchant: TodaySummary
  merchant->>whatsapp: ConfirmFulfillment
```

## Multi-Business-Type Scaling Strategy

```mermaid
flowchart TB
  core["CoreEventSourcing"]
  mini["MiniSupermarket"]
  restaurant["Restaurant"]
  fashion["FashionFuture"]
  services["ServicesFuture"]

  core --> mini
  core --> restaurant
  core --> fashion
  core --> services
```

## Kenya Commerce Ecosystem Map

```mermaid
flowchart TB
  customer["Customer"]
  whatsapp["WhatsApp"]
  merchant["Merchant"]
  mpesa["MPesa"]
  supplier["Supplier"]
  logistics["Delivery"]

  customer --> whatsapp
  whatsapp --> merchant
  merchant --> mpesa
  merchant --> supplier
  merchant --> logistics
```

## Revenue Loop (Retention + Growth)

```mermaid
flowchart LR
  orders["MoreOrders"]
  visibility["VisibilityOnWhatsApp"]
  payments["FasterPayments"]
  retention["MerchantRetention"]

  orders --> payments --> retention --> visibility --> orders
```

## Success Metrics by Business Type

| Business Type | Primary Metric | Secondary Metric |
| --- | --- | --- |
| Mini-supermarket | 50+ orders via auto-replies | < 5% order failures |
| Restaurant | 90% order parse accuracy | < 5 min response time |
| Fashion | 80% variant clarity | 30% repeat buyers |
| Services | 80% booking confirmations | 20% deposit rate |

## Pricing Model (Direction)

- Base monthly fee for core automation
- Usage-based fees for SMS reminders
- Premium add-ons for custom parsers and analytics

