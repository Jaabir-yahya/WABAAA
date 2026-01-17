# Restaurant Flow

This flow describes restaurant ordering with menu item lookup and modifiers.

## 1. Order With Modifiers

```mermaid
sequenceDiagram
  participant customer as Customer
  participant whatsapp as WhatsApp
  participant webhook as WAWebhook
  participant parser as RestaurantParser
  participant orders as Orders
  participant modifiers as OrderModifiers

  customer->>whatsapp: "chips mayai extra cheese"
  whatsapp->>webhook: MessagePayload
  webhook->>parser: ParseOrderText
  parser-->>webhook: ItemsAndModifiers
  webhook->>orders: CreateOrder
  webhook->>modifiers: InsertModifiers
  webhook->>whatsapp: ReplyWithETA
```

## 2. Menu Item Lookup

```mermaid
sequenceDiagram
  participant webhook as WAWebhook
  participant menu as MenuItems
  participant orders as Orders

  webhook->>menu: FindMenuItemsByAlias
  menu-->>webhook: MatchedItems
  webhook->>orders: BuildOrderWithPrices
```

## 3. Prep Time Estimation

```mermaid
flowchart LR
  order["OrderItems"]
  baseTime["BasePrepTime"]
  modifiers["Modifiers"]
  total["EstimatedPrepTime"]

  order --> baseTime
  modifiers --> total
  baseTime --> total
```

## 4. Fulfillment Sequence

```mermaid
sequenceDiagram
  participant merchant as Merchant
  participant pwa as MerchantPWA
  participant customer as Customer

  merchant->>pwa: OpenOrders
  pwa-->>merchant: ShowPendingOrders
  merchant->>customer: ConfirmReady
  merchant->>customer: HandoverOrder
```

