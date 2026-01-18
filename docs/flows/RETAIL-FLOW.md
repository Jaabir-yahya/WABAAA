# Retail Business Flow - Everything Lite

## Daily Operations

```mermaid
flowchart TD
  Start[MorningOpen] --> OpeningCash[RecordOpeningCash]
  OpeningCash --> Sales[RecordSales]

  Sales --> Payment{PaymentMethod}
  Payment -->|MPesa| Mpesa[AutoRecordPayment]
  Payment -->|Cash| Cash[ManualCashEntry]
  Payment -->|Credit| Credit[RecordCustomerDebt]

  Sales --> Expenses{AnyExpenses}
  Expenses -->|Yes| RecordExpense[RecordExpense]
  Expenses -->|No| ContinueSales[ContinueSales]

  RecordExpense --> ContinueSales
  ContinueSales --> EndOfDay[EveningClose]

  EndOfDay --> CountCash[CountCash]
  CountCash --> Reconcile[CashReconciliation]
  Reconcile --> Summary[DailySummaryWhatsApp]
  Summary --> Profit[RevenueMinusExpenses]
```

## Lite Features Enabled

- Sales tracking (cash, M-Pesa, credit)
- Simple inventory counts
- Customer debt tracking
- Expense recording
- Optional supplier debt tracking
- Daily cash reconciliation
- Daily summary via WhatsApp

## Lite Features Disabled

- Advanced inventory (batches, transfer, warehouse)
- Automated reordering
- Multi-warehouse transfers
- Deep analytics dashboards
