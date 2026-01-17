# SMS Integration (Africa's Talking)

This document covers SMS fallback, reminders, and daily summaries.

## Required Secrets

- `AFRICASTALKING_API_KEY`
- `AFRICASTALKING_USERNAME`
- `SMS_SENDER_ID` (optional)

## SMS Fallback Strategy

```mermaid
flowchart LR
  whatsapp["WhatsAppSend"]
  status["DeliveryStatus"]
  sms["SMSFallback"]
  customer["CustomerReceives"]

  whatsapp --> status
  status --> sms --> customer
```

## Reminder Flow

```mermaid
sequenceDiagram
  participant cron as Scheduler
  participant reminders as SendReminders
  participant sms as AfricasTalking

  cron->>reminders: Trigger
  reminders->>sms: SendReminderSMS
  sms-->>reminders: DeliveryStatus
```

## Daily Summary Flow

```mermaid
sequenceDiagram
  participant cron as Scheduler
  participant summary as DailySummary
  participant sms as AfricasTalking

  cron->>summary: Trigger
  summary->>sms: SendSummarySMS
```

## Operational Notes

- SMS messages are logged into `commerce_events`.
- Use `SMS_SENDER_ID` if a branded sender is approved.

