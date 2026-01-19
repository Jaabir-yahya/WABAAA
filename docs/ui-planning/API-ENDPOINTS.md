# API Endpoints Reference

**Base URL:** `http://localhost:3001/api` (dev) | `https://api.kcos.app/api` (prod)  
**Auth:** Bearer token in `Authorization` header  
**Format:** JSON request/response

---

## Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "kamau@duka.co.ke",
  "password": "********"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "kamau@duka.co.ke",
    "business_id": "kamau-duka"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "kamau@duka.co.ke",
    "business_id": "kamau-duka",
    "role": "owner"
  },
  "business": {
    "id": "kamau-duka",
    "name": "Kamau's Duka",
    "business_type": "retail",
    "tier": "free",
    "config": {
      "enableExpenses": true,
      "enableInventory": true,
      "enableCommissions": false
    }
  }
}
```

---

## Sales (POS)

### Record New Sale
```http
POST /api/sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_phone": "254712345678",
  "customer_name": "Wanjiku",
  "items": [
    { "name": "Unga 2kg", "qty": 2, "price": 180 },
    { "name": "Sugar 1kg", "qty": 1, "price": 150 }
  ],
  "payment_method": "mpesa",
  "payment_reference": "SBQ1234ABC",
  "is_credit": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "business_id": "kamau-duka",
  "customer_phone": "254712345678",
  "total_amount": 510,
  "outstanding_amount": 0,
  "status": "paid",
  "created_at": "2026-01-20T08:30:00Z"
}
```

### Record Credit Sale
```http
POST /api/sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_phone": "254712345678",
  "customer_name": "Wanjiku",
  "items": [
    { "name": "Cooking Oil 5L", "qty": 1, "price": 1200 }
  ],
  "is_credit": true,
  "payment_terms": "7 days"
}
```

**Response:**
```json
{
  "id": "uuid",
  "total_amount": 1200,
  "outstanding_amount": 1200,
  "is_credit": true,
  "status": "pending"
}
```

### List Today's Sales
```http
GET /api/sales?date=2026-01-20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "sales": [
    {
      "id": "uuid",
      "customer_name": "Wanjiku",
      "total_amount": 510,
      "payment_method": "mpesa",
      "status": "paid",
      "created_at": "2026-01-20T08:30:00Z"
    }
  ],
  "summary": {
    "total_sales": 15,
    "total_revenue": 12500,
    "cash_sales": 8000,
    "mpesa_sales": 4000,
    "credit_sales": 500
  }
}
```

### Get Sale Details
```http
GET /api/sales/{id}
Authorization: Bearer {token}
```

---

## Expenses

### Record Expense
```http
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "category": "transport",
  "description": "Matatu fare to get stock",
  "amount": 200,
  "payment_method": "cash"
}
```

**Response:**
```json
{
  "id": "uuid",
  "category": "transport",
  "description": "Matatu fare to get stock",
  "amount": 200,
  "expense_date": "2026-01-20",
  "created_at": "2026-01-20T09:15:00Z"
}
```

### List Expenses
```http
GET /api/expenses?start_date=2026-01-01&end_date=2026-01-20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "category": "transport",
      "description": "Matatu fare",
      "amount": 200,
      "expense_date": "2026-01-20"
    }
  ],
  "summary": {
    "total": 5200,
    "by_category": {
      "transport": 800,
      "stock": 3500,
      "utilities": 500,
      "other": 400
    }
  }
}
```

### Expense Categories
```typescript
const EXPENSE_CATEGORIES = [
  'stock',      // Inventory purchases (COGS)
  'transport',  // Matatu, boda boda
  'rent',       // Monthly rent
  'utilities',  // Electricity, water
  'wages',      // Employee payments
  'mpesa_fees', // Transaction charges
  'other'       // Miscellaneous
];
```

---

## Customers

### List Customers
```http
GET /api/customers
Authorization: Bearer {token}
```

**Response:**
```json
{
  "customers": [
    {
      "phone": "254712345678",
      "name": "Wanjiku",
      "total_orders": 45,
      "total_spent": 28500,
      "outstanding_amount": 1200,
      "last_order_at": "2026-01-20T08:30:00Z"
    }
  ]
}
```

### Get Customer Profile
```http
GET /api/customers/254712345678
Authorization: Bearer {token}
```

**Response:**
```json
{
  "phone": "254712345678",
  "name": "Wanjiku",
  "total_orders": 45,
  "total_spent": 28500,
  "outstanding_amount": 1200,
  "avg_order_value": 633,
  "recent_orders": [
    {
      "id": "uuid",
      "total_amount": 510,
      "status": "paid",
      "created_at": "2026-01-20T08:30:00Z"
    }
  ],
  "outstanding_orders": [
    {
      "id": "uuid",
      "total_amount": 1200,
      "outstanding_amount": 1200,
      "created_at": "2026-01-15T10:00:00Z",
      "payment_terms": "7 days"
    }
  ]
}
```

### Record Customer Payment
```http
POST /api/customers/254712345678/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "order_id": "uuid",
  "amount": 500,
  "payment_method": "cash"
}
```

**Response:**
```json
{
  "payment_id": "uuid",
  "amount": 500,
  "order_id": "uuid",
  "remaining_balance": 700,
  "order_status": "partial"
}
```

---

## Inventory (Basic)

### List Products
```http
GET /api/inventory
Authorization: Bearer {token}
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Unga 2kg",
      "sku": "UNGA-2KG",
      "price": 180,
      "stock_count": 25,
      "low_stock_threshold": 10,
      "category": "staples"
    }
  ]
}
```

### Adjust Stock
```http
POST /api/inventory/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": "uuid",
  "adjustment": -5,
  "reason": "sold"
}
```

---

## Reports

### Daily Summary
```http
GET /api/reports/daily?date=2026-01-20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "date": "2026-01-20",
  "revenue": {
    "total": 12500,
    "cash": 8000,
    "mpesa": 4000,
    "credit": 500
  },
  "expenses": {
    "total": 3200,
    "by_category": {
      "transport": 200,
      "stock": 3000
    }
  },
  "profit": 9300,
  "orders_count": 15,
  "new_credit": 500,
  "credit_collected": 1200
}
```

### Profit & Loss
```http
GET /api/reports/profit-loss?period=month
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": "2026-01",
  "revenue": 285000,
  "expenses": 95000,
  "gross_profit": 190000,
  "outstanding_receivables": 12500,
  "outstanding_payables": 8000
}
```

### Cash Reconciliation
```http
POST /api/reports/cash-reconciliation
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2026-01-20",
  "opening_balance": 5000,
  "actual_closing": 13200
}
```

**Response:**
```json
{
  "date": "2026-01-20",
  "opening_balance": 5000,
  "expected_cash_sales": 8000,
  "expected_expenses": 200,
  "expected_closing": 12800,
  "actual_closing": 13200,
  "variance": 400,
  "status": "surplus"
}
```

---

## Conditional Endpoints (Feature-Gated)

These endpoints require specific features enabled in business config.

### Services & Appointments
**Requires:** `config.enableAppointments = true`

```http
GET /api/services
POST /api/services
GET /api/appointments
POST /api/appointments
POST /api/appointments/{id}/confirm
```

### Suppliers
**Requires:** `config.enableSupplierCredit = true`

```http
GET /api/suppliers
POST /api/suppliers
POST /api/suppliers/{id}/purchase
POST /api/suppliers/{id}/payment
```

### Payroll
**Requires:** `config.enableCommissions = true`

```http
GET /api/payroll/employees
GET /api/payroll/commissions?period=week
POST /api/payroll/wage-payment
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than 0",
    "field": "amount"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Feature not enabled for tier |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| API routes | 100 requests / 15 min |
| Webhooks | 50 requests / 1 min |
| Reports | 20 requests / 5 min |

---

## Offline Support

All POST/PATCH endpoints should include an `idempotency_key` for safe retries:

```http
POST /api/sales
X-Idempotency-Key: sale_20260120_0830_abc123
```

This ensures duplicate requests (from offline sync) are processed only once.

---

## Dashboard

### Live Orders (Unified View)
```http
GET /api/dashboard/live?status=pending
Authorization: Bearer {token}
```

**Response:**
```json
{
  "orders": [
    {
      "order_id": "uuid",
      "customer_phone": "254712345678",
      "customer_name": "Wanjiku",
      "items": [],
      "total_amount": 1200,
      "outstanding_amount": 0,
      "status": "pending",
      "created_at": "2026-01-20T08:30:00Z",
      "customer_notes": "Prefers delivery after 5pm",
      "has_debt": false,
      "hours_old": 1.2
    }
  ]
}
```

### Dashboard Summary
```http
GET /api/dashboard/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "today": {
    "orders": 12,
    "revenue": 5400,
    "paid": 9,
    "pending": 3,
    "expenses": 1200
  },
  "profit": 4200
}
```

### Update Order Status
```http
PUT /api/dashboard/orders/{orderId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Side Effects:**
- Logs event to `commerce_events`
- Sends WhatsApp message to customer (idempotent)
- Records notification in `order_notifications`
