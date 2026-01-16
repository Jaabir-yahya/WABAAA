# Kenya Commerce OS Architecture

This document describes the current system architecture for Nairobi-first commerce on WhatsApp and M-Pesa. The system uses event sourcing as a data lake, plus operational projections for fast queries.

## System Overview

```mermaid
flowchart TB
  subgraph externalSystems [ExternalSystems]
    waCloud["WhatsAppCloudAPI"]
    mpesaDaraja["MPesaDarajaAPI"]
    africaTalking["AfricasTalkingSMS"]
  end

  subgraph ingestionLayer [IngestionLayer]
    waWebhook["whatsapp-webhook"]
    mpesaCallback["mpesa-callback"]
    smsOutbound["sms-outbound"]
  end

  subgraph coreLayer [CoreDataLake]
    events[(commerce_events)]
  end

  subgraph projections [OperationalViews]
    orders[(orders)]
    payments[(payments)]
    menuItems[(menu_items)]
    modifiers[(order_modifiers)]
  end

  subgraph serviceLayer [EdgeFunctions]
    createOrder["create-order"]
    generatePayment["generate-payment-link"]
    recordPayment["record-payment"]
    dailySummary["daily-summary"]
    sendReminders["send-reminders"]
    correctOrder["correct-order"]
  end

  subgraph uiLayer [Presentation]
    merchantPwa["MerchantPWA"]
  end

  waCloud --> waWebhook
  mpesaDaraja --> mpesaCallback
  waWebhook --> events
  mpesaCallback --> events
  smsOutbound --> events
  events --> orders
  events --> payments
  events --> menuItems
  events --> modifiers
  orders --> merchantPwa
  payments --> merchantPwa
  menuItems --> merchantPwa
  createOrder --> orders
  generatePayment --> mpesaDaraja
  recordPayment --> payments
  dailySummary --> africaTalking
  sendReminders --> africaTalking
  sendReminders --> waCloud
```

## Event Flow (WhatsApp Order)

```mermaid
sequenceDiagram
  participant customer as Customer
  participant whatsapp as WhatsApp
  participant webhook as WAWebhook
  participant parser as Parser
  participant events as EventLog
  participant orders as Orders
  participant mpesa as MPesa

  customer->>whatsapp: SendOrderText
  whatsapp->>webhook: MessagePayload
  webhook->>events: Insert whatsapp_message_in
  webhook->>parser: ParseOrderText
  parser-->>webhook: ParsedOrderItems
  webhook->>orders: CreateOrder
  webhook->>events: Insert whatsapp_message_out
  webhook->>whatsapp: SendOrderConfirmation
  webhook->>mpesa: STKPushRequest
```

## Payment Confirmation Flow

```mermaid
sequenceDiagram
  participant customer as Customer
  participant mpesa as MPesa
  participant callback as MpesaCallback
  participant events as EventLog
  participant payments as Payments
  participant orders as Orders

  customer->>mpesa: ConfirmPayment
  mpesa->>callback: PaymentCallback
  callback->>events: Insert mpesa_payment_callback
  callback->>payments: CreatePayment
  callback->>orders: ApplyOutstandingAmount
```

## Multi-Tenant Isolation (RLS)

```mermaid
flowchart LR
  request["APIRequest"]
  auth["AuthContext"]
  rls["RLSPolicies"]
  data["BusinessScopedData"]

  request --> auth
  auth -->|"sets app.current_business_id"| rls
  rls --> data
```

## Parser Registry Routing

```mermaid
flowchart TB
  message["IncomingMessage"]
  businessLookup["LoadBusinessType"]
  registry["ParserRegistry"]
  chaos["NairobiChaosParser"]
  restaurant["RestaurantParser"]
  output["ParsedOrder"]

  message --> businessLookup
  businessLookup --> registry
  registry --> chaos
  registry --> restaurant
  chaos --> output
  restaurant --> output
```

## Database Schema Relationships

```mermaid
erDiagram
  BUSINESSES ||--o{ COMMERCE_EVENTS : "has"
  BUSINESSES ||--o{ ORDERS : "has"
  BUSINESSES ||--o{ PAYMENTS : "has"
  BUSINESSES ||--o{ MENU_ITEMS : "has"
  ORDERS ||--o{ PAYMENTS : "applies"
  ORDERS ||--o{ ORDER_MODIFIERS : "has"

  BUSINESSES {
    text id
    text business_type
  }

  COMMERCE_EVENTS {
    bigint id
    text business_id
    text event_type
    text source_channel
    jsonb payload
  }

  ORDERS {
    uuid id
    text business_id
    text customer_phone
    numeric total_amount
    numeric outstanding_amount
    text status
  }

  PAYMENTS {
    uuid id
    text business_id
    uuid order_id
    numeric amount
    numeric applied_amount
    text status
  }

  MENU_ITEMS {
    uuid id
    text business_id
    text name
    numeric base_price
    boolean available
  }

  ORDER_MODIFIERS {
    uuid id
    uuid order_id
    text modifier_type
    text modifier_value
  }
```

## Notes on Data Model

- `commerce_events` is the immutable data lake and source of truth.
- `orders`, `payments`, `menu_items`, and `order_modifiers` are projections optimized for reads and operational workflows.
- All tables enforce business isolation using Row Level Security.

