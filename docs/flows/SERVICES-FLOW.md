# Services Flow - Everything Lite

## Appointment-Centered Service

```mermaid
flowchart TD
  Request[CustomerRequest] --> CheckSlots[CheckAvailability]
  CheckSlots --> Booking{SlotAvailable}
  Booking -->|Yes| CreateAppt[CreateAppointment]
  Booking -->|No| OfferAlt[OfferAlternativeSlots]

  CreateAppt --> Confirm[SendConfirmation]
  Confirm --> ServiceDay[ServiceDelivery]
  ServiceDay --> Payment{PaymentMethod}
  Payment -->|MPesa| Mpesa[AutoRecordPayment]
  Payment -->|Cash| Cash[ManualCashEntry]
  Payment -->|Credit| Credit[RecordCustomerDebt]

  ServiceDay --> CloseDay[DailySummary]
```

## Lite Features Enabled

- Service catalog
- Appointment scheduling
- WhatsApp confirmations and reminders
- Simple payments and debt tracking

## Lite Features Disabled

- Complex calendar integrations
- Resource optimization
- Advanced staff scheduling
