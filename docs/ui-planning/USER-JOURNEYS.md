# User Journeys

**Target User:** Kenyan duka owner (solo retail merchant)  
**Device:** Android phone, 5" screen, unreliable 3G  
**Language:** English with Swahili support

---

## Journey Index

1. [[#Morning Opening Routine]]
2. [[#Recording a Cash Sale]]
3. [[#Recording an M-Pesa Sale]]
4. [[#Recording a Credit Sale]]
5. [[#Recording an Expense]]
6. [[#Checking Customer Debt]]
7. [[#Collecting Debt Payment]]
8. [[#Checking Daily Summary]]
9. [[#End-of-Day Closing]]
10. [[#Offline Sale (No Internet)]]

---

## Morning Opening Routine

**Goal:** Open the app, see yesterday's summary, record opening cash float.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant Local as IndexedDB
    participant API as KCOS API
    participant DB as Supabase

    Note over K,DB: 6:00 AM - Opening the Duka
    
    K->>PWA: Open app
    PWA->>Local: Check cached auth
    Local-->>PWA: Valid token + business config
    
    PWA->>PWA: Show Dashboard (cached data)
    
    alt Online
        PWA->>API: GET /api/reports/daily?date=yesterday
        API->>DB: Query yesterday's data
        DB-->>API: Summary
        API-->>PWA: Yesterday's summary
        PWA->>Local: Cache summary
    else Offline
        PWA->>Local: Load cached summary
        Local-->>PWA: Cached data
    end
    
    PWA-->>K: Display: "Yesterday: KES 12,500 revenue"
    
    K->>PWA: Tap "Record Opening Float"
    PWA->>K: Show numpad
    K->>PWA: Enter "5000"
    PWA->>Local: Save locally
    PWA->>API: POST /api/reports/cash-reconciliation
    API-->>PWA: Float recorded
    PWA-->>K: "Opening float: KES 5,000 ✓"
```

### UI Screens

```
┌─────────────────────────────────┐
│  ☀️ Good Morning, Kamau         │
│  ─────────────────────────────  │
│                                 │
│  📊 Yesterday's Summary         │
│  ┌─────────────────────────────┐│
│  │ Revenue:     KES 12,500     ││
│  │ Expenses:    KES  3,200     ││
│  │ Profit:      KES  9,300     ││
│  │ Orders:      15             ││
│  └─────────────────────────────┘│
│                                 │
│  💰 Today's Opening Float       │
│  ┌─────────────────────────────┐│
│  │      KES [    5,000    ]    ││
│  │      [  Record Float  ]     ││
│  └─────────────────────────────┘│
│                                 │
│  ─────────────────────────────  │
│  [🛒 Sales] [📝 Expenses] [👥 Customers]│
└─────────────────────────────────┘
```

---

## Recording a Cash Sale

**Goal:** Customer pays cash, record the sale quickly.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    actor C as Customer
    participant PWA as KCOS PWA
    participant Local as IndexedDB
    participant API as KCOS API

    C->>K: "Nipe unga 2, sukari 1"
    
    K->>PWA: Tap "New Sale"
    PWA-->>K: Show sale form
    
    K->>PWA: Add "Unga 2kg" x2
    K->>PWA: Add "Sugar 1kg" x1
    PWA-->>K: Total: KES 510
    
    K->>PWA: Select "Cash" payment
    K->>PWA: Tap "Complete Sale"
    
    PWA->>Local: Save sale (offline-first)
    Local-->>PWA: Saved locally
    PWA-->>K: "Sale recorded ✓"
    
    PWA->>API: POST /api/sales (background)
    API-->>PWA: Synced ✓
    
    K->>C: "Asante!"
```

### UI Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Dashboard  │───▶│  New Sale   │───▶│  Complete   │
│             │    │             │    │             │
│ [New Sale]  │    │ Items:      │    │ ✓ Saved!    │
│             │    │ + Unga x2   │    │             │
│             │    │ + Sugar x1  │    │ [New Sale]  │
│             │    │             │    │ [Dashboard] │
│             │    │ Total: 510  │    │             │
│             │    │             │    │             │
│             │    │ [Cash]      │    │             │
│             │    │ [Complete]  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Recording an M-Pesa Sale

**Goal:** Customer pays via M-Pesa, record with transaction code.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    actor C as Customer
    participant PWA as KCOS PWA
    participant MPesa as M-Pesa
    participant API as KCOS API

    C->>MPesa: Lipa Na M-Pesa (Till: 123456)
    MPesa-->>C: Confirmation SMS
    C->>K: "Imefika" (shows phone)
    
    K->>PWA: Tap "New Sale"
    K->>PWA: Add items
    K->>PWA: Select "M-Pesa" payment
    PWA-->>K: Show M-Pesa code input
    
    K->>PWA: Enter transaction code "SBQ1234ABC"
    K->>PWA: Tap "Complete Sale"
    
    PWA->>API: POST /api/sales
    API-->>PWA: Sale recorded
    PWA-->>K: "Sale recorded ✓ M-Pesa verified"
    
    Note over K,API: If code already used, show error
```

### UI - M-Pesa Input

```
┌─────────────────────────────────┐
│  💳 M-Pesa Payment              │
│  ─────────────────────────────  │
│                                 │
│  Transaction Code:              │
│  ┌─────────────────────────────┐│
│  │      SBQ1234ABC             ││
│  └─────────────────────────────┘│
│                                 │
│  📱 Ask customer for M-Pesa     │
│     confirmation message        │
│                                 │
│  Amount: KES 510                │
│                                 │
│  [✓ Complete Sale]              │
│                                 │
└─────────────────────────────────┘
```

---

## Recording a Credit Sale

**Goal:** Customer takes goods on credit, track the debt.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    actor C as Wanjiku (Customer)
    participant PWA as KCOS PWA
    participant API as KCOS API
    participant WA as WhatsApp

    C->>K: "Nipatie mafuta, nitalipa Friday"
    
    K->>PWA: Tap "New Sale"
    K->>PWA: Add "Cooking Oil 5L" - KES 1,200
    K->>PWA: Enter customer phone: 254712345678
    K->>PWA: Toggle "Credit Sale" ON
    PWA-->>K: Show payment terms input
    
    K->>PWA: Select "7 days"
    K->>PWA: Tap "Complete Sale"
    
    PWA->>API: POST /api/sales (is_credit: true)
    API-->>PWA: Credit sale recorded
    
    API->>WA: Send WhatsApp reminder
    WA-->>C: "Wanjiku, una deni KES 1,200 kwa Kamau's Duka"
    
    PWA-->>K: "Credit sale recorded ✓"
    PWA-->>K: "Wanjiku now owes: KES 1,200"
```

### UI - Credit Sale Toggle

```
┌─────────────────────────────────┐
│  🛒 New Sale                    │
│  ─────────────────────────────  │
│                                 │
│  Items:                         │
│  • Cooking Oil 5L    KES 1,200  │
│  ─────────────────────────────  │
│  Total:              KES 1,200  │
│                                 │
│  Customer Phone:                │
│  [254712345678      ]           │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 💳 Credit Sale    [ON]      ││
│  │ Payment Terms: [7 days ▾]   ││
│  └─────────────────────────────┘│
│                                 │
│  [✓ Record Credit Sale]         │
│                                 │
└─────────────────────────────────┘
```

---

## Recording an Expense

**Goal:** Track business expenses (transport, stock purchase, etc.)

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant Local as IndexedDB
    participant API as KCOS API

    Note over K: Paid KES 200 for matatu to market
    
    K->>PWA: Tap "Expenses" tab
    K->>PWA: Tap "+" (Add Expense)
    
    PWA-->>K: Show expense form
    
    K->>PWA: Select category: "Transport"
    K->>PWA: Enter amount: 200
    K->>PWA: Add note: "Matatu to Gikomba"
    K->>PWA: Select payment: "Cash"
    K->>PWA: Tap "Save"
    
    PWA->>Local: Save locally
    PWA->>API: POST /api/expenses
    API-->>PWA: Expense recorded
    
    PWA-->>K: "Expense saved ✓"
    PWA-->>K: "Today's expenses: KES 3,400"
```

### UI - Expense Form

```
┌─────────────────────────────────┐
│  📝 New Expense                 │
│  ─────────────────────────────  │
│                                 │
│  Category:                      │
│  [🚌 Transport          ▾]      │
│                                 │
│  Amount (KES):                  │
│  [200                   ]       │
│                                 │
│  Description:                   │
│  [Matatu to Gikomba     ]       │
│                                 │
│  Paid with:                     │
│  [💵 Cash] [📱 M-Pesa]          │
│                                 │
│  [✓ Save Expense]               │
│                                 │
└─────────────────────────────────┘
```

---

## Checking Customer Debt

**Goal:** See who owes money and how much.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant API as KCOS API

    K->>PWA: Tap "Customers" tab
    PWA->>API: GET /api/customers?has_debt=true
    API-->>PWA: Customer list with debts
    
    PWA-->>K: Show debt list
    
    K->>PWA: Tap "Wanjiku"
    PWA->>API: GET /api/customers/254712345678
    API-->>PWA: Customer profile
    
    PWA-->>K: Show Wanjiku's profile
    Note over K: Sees: Total debt, debt age, order history
```

### UI - Customer Debt List

```
┌─────────────────────────────────┐
│  👥 Customers with Debt         │
│  ─────────────────────────────  │
│  Total Outstanding: KES 8,500   │
│  ─────────────────────────────  │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 👤 Wanjiku                  ││
│  │    KES 1,200 • 5 days ago   ││
│  │    ⚠️ Due in 2 days         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 👤 Otieno                   ││
│  │    KES 2,800 • 12 days ago  ││
│  │    🔴 5 days overdue        ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 👤 Amina                    ││
│  │    KES 4,500 • 3 days ago   ││
│  │    ✓ Due in 4 days          ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

---

## Collecting Debt Payment

**Goal:** Customer pays part or all of their debt.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    actor C as Wanjiku (Customer)
    participant PWA as KCOS PWA
    participant API as KCOS API

    C->>K: "Nimeleta 500" (partial payment)
    
    K->>PWA: Tap "Customers" > "Wanjiku"
    PWA-->>K: Show Wanjiku's profile (owes 1,200)
    
    K->>PWA: Tap "Record Payment"
    PWA-->>K: Show payment form
    
    K->>PWA: Enter amount: 500
    K->>PWA: Select: "Cash"
    K->>PWA: Tap "Record Payment"
    
    PWA->>API: POST /api/customers/.../payments
    API-->>PWA: Payment recorded
    
    PWA-->>K: "Payment recorded ✓"
    PWA-->>K: "Wanjiku now owes: KES 700"
```

### UI - Record Payment

```
┌─────────────────────────────────┐
│  💰 Record Payment              │
│  ─────────────────────────────  │
│  Customer: Wanjiku              │
│  Current Debt: KES 1,200        │
│  ─────────────────────────────  │
│                                 │
│  Amount Received:               │
│  [500                   ]       │
│                                 │
│  Payment Method:                │
│  [💵 Cash] [📱 M-Pesa]          │
│                                 │
│  ─────────────────────────────  │
│  After payment: KES 700 left    │
│  ─────────────────────────────  │
│                                 │
│  [✓ Record Payment]             │
│                                 │
└─────────────────────────────────┘
```

---

## Checking Daily Summary

**Goal:** Quick view of today's business performance.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant Local as IndexedDB
    participant API as KCOS API

    K->>PWA: Tap "Dashboard" / Pull to refresh
    
    alt Online
        PWA->>API: GET /api/reports/daily?date=today
        API-->>PWA: Today's summary
        PWA->>Local: Cache data
    else Offline
        PWA->>Local: Calculate from local data
        Local-->>PWA: Local summary
    end
    
    PWA-->>K: Display summary card
    
    Note over K: Sees revenue, expenses, profit, orders count
```

### UI - Dashboard Summary

```
┌─────────────────────────────────┐
│  📊 Today's Summary             │
│  January 20, 2026               │
│  ─────────────────────────────  │
│                                 │
│  💰 Revenue                     │
│  ┌─────────────────────────────┐│
│  │      KES 12,500             ││
│  │  Cash: 8,000 • MPesa: 4,000 ││
│  │  Credit: 500                ││
│  └─────────────────────────────┘│
│                                 │
│  📉 Expenses                    │
│  ┌─────────────────────────────┐│
│  │      KES 3,200              ││
│  │  Stock: 3,000 • Trans: 200  ││
│  └─────────────────────────────┘│
│                                 │
│  📈 Profit                      │
│  ┌─────────────────────────────┐│
│  │      KES 9,300              ││
│  │  ▲ 15% vs yesterday         ││
│  └─────────────────────────────┘│
│                                 │
│  🛒 Orders: 15                  │
│  👥 Customers: 12               │
│  ─────────────────────────────  │
│  [🛒 Sales] [📝 Expenses] [👥]  │
└─────────────────────────────────┘
```

---

## End-of-Day Closing

**Goal:** Reconcile cash, review day, prepare for tomorrow.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant API as KCOS API
    participant WA as WhatsApp

    Note over K: 8:00 PM - Closing time
    
    K->>PWA: Tap "Close Day"
    PWA->>API: GET /api/reports/daily
    API-->>PWA: Day summary + expected cash
    
    PWA-->>K: "Expected cash: KES 12,800"
    PWA-->>K: "Count your cash drawer"
    
    K->>PWA: Enter actual count: 13,200
    K->>PWA: Tap "Reconcile"
    
    PWA->>API: POST /api/reports/cash-reconciliation
    API-->>PWA: Variance: +400 (surplus)
    
    PWA-->>K: "Day closed ✓"
    PWA-->>K: "Variance: +KES 400 (surplus)"
    
    API->>WA: Send daily summary to Kamau
    WA-->>K: WhatsApp message with day report
```

### UI - Day Closing

```
┌─────────────────────────────────┐
│  🌙 Close Day                   │
│  January 20, 2026               │
│  ─────────────────────────────  │
│                                 │
│  📊 Day Summary                 │
│  Revenue:       KES 12,500      │
│  Expenses:      KES  3,200      │
│  Profit:        KES  9,300      │
│  ─────────────────────────────  │
│                                 │
│  💰 Cash Reconciliation         │
│  ┌─────────────────────────────┐│
│  │ Opening Float:    5,000     ││
│  │ + Cash Sales:     8,000     ││
│  │ - Cash Expenses:    200     ││
│  │ ─────────────────────────── ││
│  │ Expected:        12,800     ││
│  └─────────────────────────────┘│
│                                 │
│  Actual Cash Count:             │
│  [13,200                ]       │
│                                 │
│  Variance: +400 ✓ (Surplus)     │
│                                 │
│  [✓ Close Day]                  │
│                                 │
└─────────────────────────────────┘
```

---

## Offline Sale (No Internet)

**Goal:** Continue selling even without network connection.

```mermaid
sequenceDiagram
    actor K as Kamau (Merchant)
    participant PWA as KCOS PWA
    participant Local as IndexedDB
    participant SW as Service Worker
    participant API as KCOS API

    Note over K,API: Network unavailable
    
    K->>PWA: Record sale
    PWA->>Local: Save sale with pending_sync flag
    Local-->>PWA: Saved locally
    PWA-->>K: "Sale saved (will sync when online)"
    
    Note over K: Continue working offline...
    K->>PWA: Record 5 more sales
    PWA->>Local: Save all locally
    
    Note over K,API: Network restored
    
    SW->>SW: Detect network online
    SW->>Local: Get pending_sync items
    Local-->>SW: 6 pending sales
    
    loop For each pending sale
        SW->>API: POST /api/sales
        API-->>SW: Synced
        SW->>Local: Mark as synced
    end
    
    SW->>PWA: Background sync complete
    PWA-->>K: "6 sales synced ✓"
```

### UI - Offline Indicator

```
┌─────────────────────────────────┐
│  ⚡ OFFLINE MODE                │
│  ─────────────────────────────  │
│  Sales saved locally            │
│  Will sync when online          │
│  ─────────────────────────────  │
│                                 │
│  📊 Today's Summary (Local)     │
│  Revenue: KES 8,500             │
│  Pending sync: 6 sales          │
│                                 │
│  [🛒 New Sale]                  │
│                                 │
│  ─────────────────────────────  │
│  🔄 Last synced: 2 hours ago    │
└─────────────────────────────────┘
```

---

## Navigation Structure

```mermaid
flowchart TB
    subgraph Main["Main Navigation"]
        Dashboard[🏠 Dashboard]
        Sales[🛒 Sales]
        Expenses[📝 Expenses]
        Customers[👥 Customers]
        More[⚙️ More]
    end
    
    subgraph SalesFlow["Sales Flow"]
        NewSale[New Sale]
        SalesList[Sales List]
        SaleDetail[Sale Detail]
    end
    
    subgraph CustomerFlow["Customer Flow"]
        CustomerList[Customer List]
        CustomerProfile[Customer Profile]
        RecordPayment[Record Payment]
    end
    
    subgraph ExpenseFlow["Expense Flow"]
        NewExpense[New Expense]
        ExpenseList[Expense List]
    end
    
    subgraph MoreOptions["More Options"]
        Reports[📊 Reports]
        Inventory[📦 Inventory]
        Settings[⚙️ Settings]
        Profile[👤 Profile]
    end
    
    Dashboard --> Sales
    Dashboard --> Expenses
    Dashboard --> Customers
    Dashboard --> More
    
    Sales --> NewSale
    Sales --> SalesList
    SalesList --> SaleDetail
    
    Customers --> CustomerList
    CustomerList --> CustomerProfile
    CustomerProfile --> RecordPayment
    
    Expenses --> NewExpense
    Expenses --> ExpenseList
    
    More --> Reports
    More --> Inventory
    More --> Settings
    More --> Profile
```

---

## Feature Flags in UI

Based on business config, show/hide features:

```svelte
{#if $businessConfig.enableExpenses}
  <NavItem href="/expenses" icon="📝">Expenses</NavItem>
{/if}

{#if $businessConfig.enableInventory}
  <NavItem href="/inventory" icon="📦">Inventory</NavItem>
{/if}

{#if $businessConfig.enableAppointments}
  <NavItem href="/appointments" icon="📅">Appointments</NavItem>
{/if}

{#if $businessConfig.enableSupplierCredit}
  <NavItem href="/suppliers" icon="🏭">Suppliers</NavItem>
{/if}
```
