# Mini-Supermarket Flow

This flow describes the default Kamau workflow for WhatsApp ordering and M-Pesa payments.

## 1. Customer Order Sequence

```mermaid
sequenceDiagram
  participant customer as Customer
  participant whatsapp as WhatsApp
  participant webhook as WAWebhook
  participant parser as NairobiChaosParser
  participant orders as Orders

  customer->>whatsapp: "sukari 2kg"
  whatsapp->>webhook: MessagePayload
  webhook->>parser: ParseOrderText
  parser-->>webhook: ParsedItems
  webhook->>orders: CreateOrder
  webhook->>whatsapp: AutoReplyConfirmation
```

## 2. Payment Confirmation Flow

```mermaid
sequenceDiagram
  participant customer as Customer
  participant mpesa as MPesa
  participant callback as MpesaCallback
  participant payments as Payments
  participant orders as Orders

  customer->>mpesa: STKPushConfirm
  mpesa->>callback: PaymentCallback
  callback->>payments: InsertPayment
  callback->>orders: ReduceOutstandingAmount
```

## 3. Daily SMS Summary

```mermaid
sequenceDiagram
  participant cron as Scheduler
  participant summary as DailySummary
  participant sms as AfricasTalking
  participant merchant as Merchant

  cron->>summary: TriggerDailySummary
  summary->>sms: SendSummarySMS
  sms->>merchant: DeliveredSummary
```

## 4. Payment Reminder Flow

```mermaid
sequenceDiagram
  participant cron as Scheduler
  participant reminders as SendReminders
  participant whatsapp as WhatsApp
  participant sms as AfricasTalking
  participant customer as Customer

  cron->>reminders: TriggerReminders
  reminders->>whatsapp: TryWhatsAppReminder
  whatsapp-->>reminders: DeliveryStatus
  reminders->>sms: FallbackSMS
  sms->>customer: ReminderDelivered
```

