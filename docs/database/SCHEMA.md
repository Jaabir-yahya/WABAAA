# Database Schema

This document describes the core schema, relationships, indexes, and RLS policy strategy.

## Entity Relationship Diagram

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
    text status
  }

  COMMERCE_EVENTS {
    bigint id
    text business_id
    text event_type
    text source_channel
    text source_id
    jsonb payload
    timestamptz occurred_at
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

## Core Tables

### commerce_events
- Immutable audit log
- Event types are locked to known values
- Used for reconciliation, debugging, and analytics

### orders
- Operational state with outstanding balance tracking
- Used by PWA dashboards and reminder services

### payments
- Applied payments with M-Pesa receipts
- Reconciles against orders

### order_notifications
- Tracks outbound notifications for idempotency
- Prevents duplicate WhatsApp/SMS sends on retries
- Primary key: (order_id, status, channel)

### menu_items
- Restaurant menu catalog with aliases and modifiers

### order_modifiers
- Per-item modifiers for restaurant orders

## Index Strategy

- `orders(business_id)`
- `orders(status)`
- `orders(outstanding_amount) WHERE outstanding_amount > 0`
- `payments(business_id)`
- `menu_items(business_id)`
- `order_modifiers(order_id)`

## RLS Strategy

```mermaid
flowchart LR
  request["QueryRequest"]
  context["app.current_business_id"]
  policy["RLSPolicy"]
  rows["BusinessScopedRows"]

  request --> context --> policy --> rows
```

## Query Optimization Paths

```mermaid
flowchart TB
  dashboard["DashboardQuery"]
  orders["orders_indexed"]
  payments["payments_indexed"]
  menu["menu_items_indexed"]

  dashboard --> orders
  dashboard --> payments
  dashboard --> menu
```

## Migration History

- `0003_create_explicit_orders_payments.sql` (orders, payments, RLS)
- `0004_business_types_and_modifiers.sql` (business_type, menu_items, order_modifiers)

