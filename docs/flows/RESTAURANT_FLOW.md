# Restaurant Flow - Everything Lite

## Order Intake to Kitchen

```mermaid
flowchart TD
  Order[OrderReceived] --> Parse[ParseMenuItems]
  Parse --> CreateOrder[CreateOrder]
  CreateOrder --> NotifyKitchen[KitchenNotify]
  NotifyKitchen --> ETA[SendETA]
  ETA --> Payment{PaymentMethod}
  Payment -->|MPesa| Mpesa[AutoRecordPayment]
  Payment -->|Cash| Cash[ManualCashEntry]
  Payment -->|Credit| Credit[RecordCustomerDebt]
  Payment --> Serve[PrepareAndServe]
```

## Lite Features Enabled

- Menu item catalog
- Simple kitchen notifications
- Fast payment capture
- Basic order tracking

## Lite Features Disabled

- Complex modifiers engine
- Table management automation
- Advanced inventory depletion

