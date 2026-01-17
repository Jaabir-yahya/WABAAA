# Order State Machine

This state machine defines the lifecycle of an order and the conditions that trigger transitions.

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Partial : PaymentReceivedPartial
  Pending --> Paid : PaymentReceivedFull
  Partial --> Paid : RemainingPaymentReceived
  Paid --> Fulfilled : OrderDelivered
  Pending --> Cancelled : MerchantCancel
  Partial --> Cancelled : MerchantCancel
  Paid --> Refunded : RefundIssued
  Refunded --> [*]
  Cancelled --> [*]
  Fulfilled --> [*]
```

## Transition Notes

- `PaymentReceivedPartial`: applied_amount < outstanding_amount
- `PaymentReceivedFull`: applied_amount >= outstanding_amount
- `OrderDelivered`: merchant confirms delivery or pickup
- `RefundIssued`: manual correction after payment

