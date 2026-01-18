# 🧪 Capability Test Plan - Kenya Commerce OS

**Purpose**: Efficiently test all 10 capabilities, 7 patterns, and 8 Kenya workflows  
**Strategy**: Test in isolation → Test compositions → Test real workflows  
**Duration**: 4-6 hours (can be done in parallel)  

---

## 🎯 TEST STRATEGY

### **Phase 1: Capability Tests** (Unit-level)
Test each of the 10 capabilities independently to verify they work in isolation.

### **Phase 2: Composition Tests** (Integration-level)
Test how capabilities combine to create patterns (7 patterns).

### **Phase 3: Workflow Tests** (End-to-end)
Test complete Kenya workflows (8 use cases) with real-world scenarios.

### **Phase 4: Edge Cases** (Stress & failure)
Test failure modes, network issues, concurrency, Kenya-specific edge cases.

---

## 📊 TEST MATRIX (Efficiency)

Instead of testing every combination, we use a **critical path matrix**:

```
CAPABILITY × PATTERN → Test once per critical path
PATTERN × USE CASE → Test representative workflows
USE CASE × EDGE CASE → Test Kenya-specific scenarios
```

**Result**: ~50 focused tests instead of 200+ redundant tests

---

## 🧱 PHASE 1: CAPABILITY TESTS (10 Capabilities)

### **1. Message Ingestion & Parsing** ✅ (Already 47/47 passing)

**Test File**: `_tests/whatsapp-webhook.test.ts`

```typescript
// Already tested:
✅ Swahili order parsing ("nataka 2kg sukari")
✅ English order parsing ("I want 2kg sugar")
✅ Mixed language parsing
✅ Multi-item orders
✅ Quantity extraction
✅ Unit detection (kg, ltr, pcs)
✅ Payment parsing ("lipa 500")
✅ Confidence scoring
✅ Unknown message handling

// Add if missing:
[ ] Alias matching (sukari = sugar = swit)
[ ] Fuzzy product matching (sukarii → sukari)
[ ] Multiple quantities in one sentence
[ ] Special characters handling
```

**Test Command**:
```bash
cd supabase/functions
deno test _tests/whatsapp-webhook.test.ts -A
```

---

### **2. Business Type Routing** ✅ (Already tested)

**Test File**: `_tests/whatsapp-webhook.test.ts` (multi-business section)

```typescript
// Already tested:
✅ mini_supermarket routing (NairobiChaosParser)
✅ restaurant routing (RestaurantParser)
✅ Parser registry lookup
✅ Business-specific pricing
✅ Business-specific messages

// Add if missing:
[ ] Non-existent business_id handling
[ ] Invalid business type handling
[ ] Parser fallback (if custom parser fails)
```

**Test Command**:
```bash
deno test _tests/whatsapp-webhook.test.ts --filter "multi-business" -A
```

---

### **3. Order Management** ✅ (Already tested)

**Test File**: `_tests/create-order.test.ts`, `_tests/correct-order.test.ts`

```typescript
// Already tested:
✅ Order creation (API)
✅ Order creation (WhatsApp)
✅ Order correction (merchant always wins)
✅ Order status transitions
✅ Outstanding amount tracking
✅ Multi-item orders
✅ Order modifiers (restaurant)

// Add if missing:
[ ] Order cancellation flow
[ ] Order status validation (no invalid transitions)
[ ] Concurrent order updates (race conditions)
```

**Test Command**:
```bash
deno test _tests/create-order.test.ts -A
deno test _tests/correct-order.test.ts -A
```

---

### **4. Payment Processing** ✅ (Already tested)

**Test File**: `_tests/mpesa-callback.test.ts`, `_tests/record-payment.test.ts`

```typescript
// Already tested:
✅ M-Pesa STK Push
✅ M-Pesa callback verification
✅ QR metadata decoding (KCOS:)
✅ Auto-order creation from QR
✅ Partial payment application
✅ Outstanding amount updates
✅ Manual payment recording
✅ Idempotency (duplicate webhooks)

// Add if missing:
[ ] Failed payment handling
[ ] Overpayment handling (amount > outstanding)
[ ] Multiple payments per order
[ ] Payment without order (orphaned payment)
```

**Test Command**:
```bash
deno test _tests/mpesa-callback.test.ts -A
deno test _tests/record-payment.test.ts -A
```

---

### **5. Communication Channels** (Partial coverage)

**Test Files**: `_tests/whatsapp-webhook.test.ts`, manual SMS tests

```typescript
// Already tested:
✅ WhatsApp inbound (webhook)
✅ WhatsApp outbound (auto-reply)
✅ QR generation (4 types)

// Add manual tests:
[ ] SMS delivery (send test SMS)
[ ] WhatsApp template messages
[ ] QR scan tracking
[ ] Deep link generation (wa.me/...)

// Test manually:
[ ] WhatsApp rate limit handling
[ ] SMS delivery confirmation
[ ] QR code rendering (visual check)
```

**Test Command**:
```bash
# WhatsApp (automated)
deno test _tests/whatsapp-webhook.test.ts -A

# SMS (manual - requires real API)
curl -X POST https://[project].supabase.co/functions/v1/daily-summary \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense", "test": true}'
```

---

### **6. Merchant Dashboard** (Manual UI testing)

**Test**: Open PWA and verify all 5 screens

```typescript
// Leo (Today) Screen:
[ ] Revenue today displays (KES format)
[ ] Orders count correct
[ ] Outstanding debts show (traffic lights)
[ ] Top products list
[ ] Trend arrows (↑ ↓ →)
[ ] Generate Invoice QR button works

// Deni (Debts) Screen:
[ ] Customer debt list shows
[ ] Traffic lights: 🔴 >7 days, 🟡 1-7 days, 🟢 paid
[ ] Total outstanding correct
[ ] Send reminder button works (one-tap)

// Bidhaa (Products) Screen:
[ ] Top products by revenue
[ ] Menu management (restaurant only)
[ ] Add/edit products works

// Wateja (Customers) Screen:
[ ] Customer list displays
[ ] Total spent per customer
[ ] Outstanding balance per customer
[ ] Last order date shown

// Sawa (Verification) Screen:
[ ] System health indicators
[ ] Today's summary stats
[ ] Data export works (CSV download)
```

**Test Command**:
```bash
cd apps/merchant-svelte
npm run dev
# Open http://localhost:5173 in browser
# Test offline: DevTools → Application → Service Workers → Offline checkbox
```

---

### **7. Automation & Reminders** (Partial coverage)

**Test Files**: Scheduled tests (manual trigger)

```typescript
// Daily Summary:
[ ] Triggers at 18:00 (or manually)
[ ] Calculates revenue correctly
[ ] Calculates outstanding correctly
[ ] Finds top products
[ ] Sends SMS
[ ] Sends WhatsApp (if enabled)

// Payment Reminders:
[ ] Finds overdue orders (>7 days)
[ ] Sends WhatsApp reminder
[ ] Falls back to SMS if WhatsApp fails
[ ] Logs events correctly
```

**Test Command**:
```bash
# Manual trigger daily summary
curl -X POST https://[project].supabase.co/functions/v1/daily-summary \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense"}'

# Manual trigger payment reminders
curl -X POST https://[project].supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense"}'
```

---

### **8. Event Sourcing & Audit** ✅ (Already tested)

**Test File**: Database integrity tests

```typescript
// Already tested:
✅ Events are immutable (no updates/deletes)
✅ All operations log events
✅ Event types are locked (enum validation)
✅ Payload capture is complete

// Add if missing:
[ ] Event replay (reconstruct state from events)
[ ] Event count matches operation count
[ ] No orphaned events (all have valid business_id)
```

**Test Command**:
```bash
# Check event log integrity
psql [connection_string] -c "
  SELECT event_type, COUNT(*) 
  FROM commerce_events 
  GROUP BY event_type 
  ORDER BY COUNT(*) DESC;
"
```

---

### **9. Financial Foundation** ✅ (Already tested)

**Test File**: `_tests/update-customer-profile.test.ts`, `_tests/partner-gateway.test.ts`

```typescript
// Already tested:
✅ Customer profile calculation
✅ Business metrics calculation
✅ Partner API authentication
✅ Partner API rate limiting

// Add if missing:
[ ] LTV calculation accuracy
[ ] Payment velocity calculation
[ ] Credit score formula validation
[ ] Business health score edge cases
```

**Test Command**:
```bash
deno test _tests/update-customer-profile.test.ts -A
deno test _tests/partner-gateway.test.ts -A
```

---

### **10. Security & Compliance** ✅ (Already tested)

**Test File**: Security tests

```typescript
// Already tested:
✅ RLS isolation (no cross-tenant leaks)
✅ JWT authentication
✅ Rate limiting (100 req/min)
✅ Security audit logging

// Add if missing:
[ ] SQL injection attempts (parameterized queries)
[ ] XSS prevention (sanitized inputs)
[ ] CSRF protection (token validation)
[ ] Unauthorized access attempts (401/403)
```

**Test Command**:
```bash
# Test RLS isolation
psql [connection_string] -c "
  SET app.current_business_id = 'elixosense';
  SELECT COUNT(*) FROM orders; -- Should only see elixosense orders
"
```

---

## 🔄 PHASE 2: COMPOSITION TESTS (7 Patterns)

### **Pattern 1: WhatsApp Order Flow** ✅ (Already tested)

**Test File**: `_tests/e2e-flow.test.ts`

```typescript
// Already tested:
✅ End-to-end WhatsApp → Parse → Order → Payment → Confirmation

// Additional scenarios:
[ ] Order with invalid product (fallback handling)
[ ] Order with missing quantity (parser confidence < 0.7)
[ ] Payment callback timeout (retry logic)
[ ] WhatsApp send failure (log and alert)
```

**Test Command**:
```bash
deno test _tests/e2e-flow.test.ts -A
```

---

### **Pattern 2: QR Order Flow** ✅ (Already tested)

**Test File**: `_tests/mpesa-callback.test.ts` (QR section)

```typescript
// Already tested:
✅ QR metadata decoding
✅ Auto-order creation from QR payment
✅ Payment application

// Additional scenarios:
[ ] QR with invalid metadata (malformed JSON)
[ ] QR payment without metadata (regular payment)
[ ] QR scan tracking (analytics)
[ ] QR conversion rate calculation
```

**Test Command**:
```bash
deno test _tests/mpesa-callback.test.ts --filter "QR" -A
```

---

### **Pattern 3: Restaurant Order with Modifiers** ✅ (Already tested)

**Test File**: `_tests/whatsapp-webhook.test.ts` (restaurant section)

```typescript
// Already tested:
✅ Modifier extraction ("extra cheese")
✅ Multiple modifiers per item
✅ Negative modifiers ("no onions")
✅ Order_modifiers table population

// Additional scenarios:
[ ] Conflicting modifiers ("extra cheese" + "no cheese")
[ ] Unknown modifiers (ignored gracefully)
[ ] Prep time calculation with complex orders
```

**Test Command**:
```bash
deno test _tests/whatsapp-webhook.test.ts --filter "restaurant" -A
```

---

### **Pattern 4: Daily Business Summary** (Manual test)

**Test**: Trigger and verify summary

```typescript
// Test scenarios:
[ ] Summary with orders (normal day)
[ ] Summary with no orders (zero revenue)
[ ] Summary with only debts (no new revenue)
[ ] Summary with top products (>3 products)
[ ] SMS delivery confirmation
[ ] WhatsApp delivery (if enabled)
```

**Test Command**:
```bash
# Trigger for test business
curl -X POST https://[project].supabase.co/functions/v1/daily-summary \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense", "test_mode": true}'

# Check SMS delivery in Africa's Talking dashboard
# Check WhatsApp delivery in Meta Business Manager
```

---

### **Pattern 5: Payment Reminder Flow** (Manual test)

**Test**: Create overdue order and trigger reminder

```typescript
// Test scenarios:
[ ] Reminder for 7-day overdue order
[ ] Reminder for 14-day overdue order
[ ] WhatsApp reminder success
[ ] SMS fallback when WhatsApp fails
[ ] No reminder for already paid orders
```

**Test Command**:
```bash
# 1. Create test order with old date
psql [connection_string] -c "
  INSERT INTO orders (business_id, customer_phone, total_amount, outstanding_amount, created_at)
  VALUES ('elixosense', '+254712345678', 1000, 1000, NOW() - INTERVAL '8 days');
"

# 2. Trigger reminders
curl -X POST https://[project].supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense"}'
```

---

### **Pattern 6: Merchant Dashboard Real-Time** (Manual UI test)

**Test**: Open PWA, trigger payment, verify update

```typescript
// Test scenarios:
[ ] Open Leo screen
[ ] Keep open
[ ] Trigger payment via API (or simulate M-Pesa callback)
[ ] Verify revenue updates in <500ms (watch screen)
[ ] Verify outstanding debts update
[ ] Verify Deni screen updates (if debt paid)
```

**Test Command**:
```bash
# Terminal 1: Start PWA
cd apps/merchant-svelte && npm run dev

# Terminal 2: Trigger payment
curl -X POST https://[project].supabase.co/functions/v1/record-payment \
  -H "Authorization: Bearer [key]" \
  -d '{
    "business_id": "elixosense",
    "order_id": "[order_id]",
    "amount": 500,
    "mpesa_receipt": "TEST123"
  }'

# Watch Terminal 1 browser - Leo screen should update instantly
```

---

### **Pattern 7: Partner Credit Check** ✅ (Already tested)

**Test File**: `_tests/partner-gateway.test.ts`

```typescript
// Already tested:
✅ JWT authentication
✅ Rate limiting
✅ Financial data return
✅ Credit score calculation

// Additional scenarios:
[ ] Expired JWT (401 Unauthorized)
[ ] Missing JWT (401 Unauthorized)
[ ] Rate limit exceeded (429 Too Many Requests)
[ ] Non-existent customer (404 Not Found)
```

**Test Command**:
```bash
deno test _tests/partner-gateway.test.ts -A
```

---

## 🇰🇪 PHASE 3: WORKFLOW TESTS (8 Kenya Use Cases)

### **Workflow 1: Mini-Supermarket (Kamau)** 🎯 CRITICAL

**Full end-to-end test** - Simulates Kamau's daily workflow

```typescript
// Scenario: Typical Kamau day
MORNING:
[ ] Customer sends WhatsApp: "Nataka sukari 2kg na maziwa 1ltr"
[ ] Auto-reply received with price (KES 280)
[ ] M-Pesa link sent
[ ] Customer pays
[ ] Payment confirmed
[ ] Kamau sees order in Leo screen

MIDDAY:
[ ] Another order (partial payment)
[ ] Outstanding tracked in Deni screen

EVENING:
[ ] 18:00 SMS summary received
[ ] Shows: Revenue KES 280, Outstanding KES X
[ ] Top product: sukari

NEXT DAY:
[ ] 09:00 Payment reminder sent (for overdue)
[ ] Customer pays outstanding
[ ] Deni screen updates (red → green)
```

**Test Script** (Automated):
```bash
#!/bin/bash
# test-kamau-workflow.sh

echo "=== KAMAU WORKFLOW TEST ==="

# 1. Morning order
echo "1. Sending WhatsApp order..."
ORDER_RESPONSE=$(curl -X POST https://[project].supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254712345678",
            "text": {"body": "Nataka sukari 2kg na maziwa 1ltr"}
          }]
        }
      }]
    }]
  }')

echo "Order response: $ORDER_RESPONSE"

# 2. Simulate M-Pesa payment
echo "2. Simulating M-Pesa payment..."
PAYMENT_RESPONSE=$(curl -X POST https://[project].supabase.co/functions/v1/mpesa-callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 0,
    "TransAmount": 280,
    "PhoneNumber": "254712345678",
    "MpesaReceiptNumber": "TEST123"
  }')

echo "Payment response: $PAYMENT_RESPONSE"

# 3. Check Leo screen data
echo "3. Checking Leo screen data..."
LEO_DATA=$(curl https://[project].supabase.co/rest/v1/orders?business_id=eq.elixosense \
  -H "apikey: [key]")

echo "Leo data: $LEO_DATA"

# 4. Trigger daily summary
echo "4. Triggering daily summary..."
SUMMARY=$(curl -X POST https://[project].supabase.co/functions/v1/daily-summary \
  -d '{"business_id": "elixosense"}')

echo "Summary sent: $SUMMARY"

echo "=== TEST COMPLETE ==="
```

---

### **Workflow 2: Restaurant** 🍽️

**Test**: Order with modifiers

```typescript
// Scenario: Restaurant customer orders with customization
[ ] Customer: "Chips mayai extra cheese no onions"
[ ] Parser extracts: base=chips mayai, modifiers=[extra cheese, no onions]
[ ] Order created with modifiers
[ ] Price calculated (base + extra cheese cost)
[ ] Auto-reply: "Order: Chips mayai (extra cheese, no onions), KES X, Ready in 20 min"
[ ] Payment link sent
[ ] Customer pays
[ ] Merchant sees order with modifiers in Bidhaa screen
```

**Test Command**:
```bash
curl -X POST https://[project].supabase.co/functions/v1/whatsapp-webhook \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254712345678",
            "text": {"body": "Chips mayai extra cheese no onions"}
          }]
        }
      }]
    }]
  }'
```

---

### **Workflow 3: QR-First Shop** 📱

**Test**: Customer scans product QR and pays

```typescript
// Scenario: Product QR on sukari bag
[ ] Merchant generates QR for sukari (2kg, KES 200)
[ ] QR contains: M-Pesa Till + KCOS:{"product":"sukari","qty":2,"unit":"kg","price":200}
[ ] Customer scans with M-Pesa app
[ ] Customer pays KES 200
[ ] M-Pesa callback received with metadata
[ ] System decodes KCOS metadata
[ ] Order auto-created (no WhatsApp needed)
[ ] Payment applied to order
[ ] Merchant sees order in Leo screen instantly
```

**Test Command**:
```bash
# 1. Generate QR
curl -X POST https://[project].supabase.co/functions/v1/generate-qr \
  -d '{
    "business_id": "elixosense",
    "type": "product",
    "product_name": "sukari",
    "quantity": 2,
    "unit": "kg",
    "price": 200
  }'

# 2. Simulate M-Pesa payment with metadata
curl -X POST https://[project].supabase.co/functions/v1/mpesa-callback \
  -d '{
    "ResultCode": 0,
    "TransAmount": 200,
    "PhoneNumber": "254712345678",
    "TransactionReference": "KCOS:eyJwcm9kdWN0Ijoic3VrYXJpIiwicXR5IjoyLCJ1bml0Ijoia2ciLCJwcmljZSI6MjAwfQ==",
    "MpesaReceiptNumber": "QR123"
  }'

# 3. Verify order auto-created
psql [connection_string] -c "
  SELECT * FROM orders 
  WHERE source = 'qr' 
  ORDER BY created_at DESC 
  LIMIT 1;
"
```

---

### **Workflow 4: Invoice Payment** 📄

**Test**: Manual order → Invoice QR → Payment

```typescript
// Scenario: Bulk church order
[ ] Merchant creates order manually (API)
[ ] Order: 100 people × KES 500 = KES 50,000
[ ] Generate invoice QR
[ ] Send QR image via WhatsApp to church treasurer
[ ] Treasurer scans and pays deposit (KES 12,500)
[ ] Outstanding: KES 37,500
[ ] Treasurer pays balance on delivery (KES 37,500)
[ ] Outstanding: KES 0
```

**Test Command**:
```bash
# 1. Create manual order
curl -X POST https://[project].supabase.co/functions/v1/create-order \
  -d '{
    "business_id": "elixosense",
    "customer_phone": "+254712345678",
    "customer_name": "St. Mary Church",
    "items": [{"product": "lunch_pack", "qty": 100, "price": 500}],
    "total_amount": 50000,
    "notes": "Church event - delivery Sunday 2pm"
  }'

# 2. Generate invoice QR
curl -X POST https://[project].supabase.co/functions/v1/generate-qr \
  -d '{
    "business_id": "elixosense",
    "type": "invoice",
    "order_id": "[order_id]",
    "amount": 50000
  }'

# 3. Simulate deposit payment
curl -X POST https://[project].supabase.co/functions/v1/record-payment \
  -d '{
    "business_id": "elixosense",
    "order_id": "[order_id]",
    "amount": 12500,
    "mpesa_receipt": "DEP123",
    "notes": "Deposit - 25%"
  }'

# 4. Simulate balance payment
curl -X POST https://[project].supabase.co/functions/v1/record-payment \
  -d '{
    "business_id": "elixosense",
    "order_id": "[order_id]",
    "amount": 37500,
    "mpesa_receipt": "BAL456",
    "notes": "Balance - delivery"
  }'
```

---

### **Workflow 5: Multi-Location Business** (Simplified test)

**Test**: Two branches, independent operations

```typescript
// Scenario: Business with 2 locations
[ ] Branch A (elixosense) receives order
[ ] Branch B (elixosense-westlands) receives order
[ ] Both show in separate dashboards
[ ] No cross-contamination (RLS isolation)
[ ] Owner can query both (manual aggregation)
```

**Test Command**:
```bash
# 1. Create second business
psql [connection_string] -c "
  INSERT INTO businesses (id, business_type, whatsapp_number)
  VALUES ('elixosense-westlands', 'mini_supermarket', '+254700000000');
"

# 2. Send order to Branch A
curl -X POST .../whatsapp-webhook \
  -d '{"business_id": "elixosense", ...}'

# 3. Send order to Branch B
curl -X POST .../whatsapp-webhook \
  -d '{"business_id": "elixosense-westlands", ...}'

# 4. Verify isolation
psql [connection_string] -c "
  SET app.current_business_id = 'elixosense';
  SELECT COUNT(*) FROM orders; -- Should only see Branch A
"
```

---

### **Workflow 6: Credit/Debt Management** 💳

**Test**: Credit order → Reminders → Partial payments

```typescript
// Scenario: Customer on credit
[ ] Customer orders (WhatsApp)
[ ] Merchant approves credit (doesn't require payment)
[ ] Order created with full outstanding
[ ] 7 days pass → Reminder sent (09:00)
[ ] Customer pays partial (KES 500 of KES 1000)
[ ] Outstanding: KES 500
[ ] 14 days pass → Another reminder
[ ] Customer pays balance
[ ] Outstanding: KES 0
[ ] Deni screen: Red → Yellow → Green
```

**Test Command**:
```bash
# 1. Create order without payment
curl -X POST .../create-order \
  -d '{
    "business_id": "elixosense",
    "customer_phone": "+254712345678",
    "items": [...],
    "total_amount": 1000,
    "allow_credit": true
  }'

# 2. Manually set created_at to 8 days ago
psql [connection_string] -c "
  UPDATE orders 
  SET created_at = NOW() - INTERVAL '8 days'
  WHERE id = '[order_id]';
"

# 3. Trigger reminder
curl -X POST .../send-reminders \
  -d '{"business_id": "elixosense"}'

# 4. Record partial payment
curl -X POST .../record-payment \
  -d '{
    "order_id": "[order_id]",
    "amount": 500,
    "mpesa_receipt": "PART123"
  }'

# 5. Record balance payment
curl -X POST .../record-payment \
  -d '{
    "order_id": "[order_id]",
    "amount": 500,
    "mpesa_receipt": "BAL456"
  }'
```

---

### **Workflow 7: Customer Retention** 🎯

**Test**: Track customer over time

```typescript
// Scenario: Customer ordering multiple times
[ ] Customer makes first order (Day 1)
[ ] Profile created in customer_financial_profiles
[ ] Customer makes second order (Day 7)
[ ] LTV increases
[ ] Payment velocity tracked
[ ] Customer makes third order (Day 14)
[ ] Reliability score calculated
[ ] Merchant sees in Wateja screen (top customer)
```

**Test Command**:
```bash
# 1. Create 3 orders over time
for i in 1 2 3; do
  curl -X POST .../create-order \
    -d "{
      \"customer_phone\": \"+254712345678\",
      \"items\": [...],
      \"total_amount\": $((i * 1000))
    }"
  
  curl -X POST .../record-payment \
    -d "{
      \"order_id\": \"[order_id]\",
      \"amount\": $((i * 1000))
    }"
done

# 2. Trigger customer profile update
curl -X POST .../update-customer-profile \
  -d '{
    "business_id": "elixosense",
    "customer_phone": "+254712345678"
  }'

# 3. Check profile
psql [connection_string] -c "
  SELECT * FROM customer_financial_profiles
  WHERE customer_phone = '+254712345678';
"
```

---

### **Workflow 8: Business Health Monitoring** 📊

**Test**: Partner API access to business metrics

```typescript
// Scenario: Lending partner checks business health
[ ] Business operates for 30 days
[ ] 50+ orders processed
[ ] 45 payments received (5 overdue)
[ ] Business metrics calculated
[ ] Partner API called for credit check
[ ] Returns: health score, revenue trend, payment reliability
```

**Test Command**:
```bash
# 1. Trigger business metrics update
curl -X POST .../update-business-metrics \
  -d '{"business_id": "elixosense"}'

# 2. Partner API call
curl -X GET https://[project].supabase.co/functions/v1/partner-gateway/business/elixosense \
  -H "Authorization: Bearer [partner_jwt]"

# Expected response:
# {
#   "business_id": "elixosense",
#   "health_score": 85,
#   "revenue_30d": 150000,
#   "orders_30d": 50,
#   "payment_success_rate": 0.90,
#   "avg_order_value": 3000,
#   "working_capital": 45000
# }
```

---

## ⚠️ PHASE 4: EDGE CASES & KENYA-SPECIFIC (Critical)

### **Kenya Reality Tests**

```typescript
// 1. NETWORK ISSUES (Very common in Kenya)
[ ] WhatsApp webhook timeout (retry logic)
[ ] M-Pesa callback delayed (>5 min)
[ ] SMS delivery failure (fallback)
[ ] PWA offline mode (no internet)
[ ] Background sync when network returns

// 2. WHATSAPP SHUTDOWN (Political events)
[ ] WhatsApp down → SMS fallback works
[ ] Orders queued during outage
[ ] Process queued orders when WhatsApp returns

// 3. M-PESA ISSUES
[ ] M-Pesa API down (manual payment entry)
[ ] Failed payment (insufficient funds)
[ ] Duplicate payment (idempotency works)
[ ] Callback never received (timeout handling)

// 4. LOW-END DEVICES
[ ] PWA loads on 2GB RAM Android
[ ] Dashboard responsive on 5" screen
[ ] Bundle size <100KB
[ ] Works on 3G network

// 5. LANGUAGE & LITERACY
[ ] Mixed Swahili/English messages
[ ] Incorrect spellings (fuzzy matching)
[ ] All-caps messages
[ ] Messages with emojis
[ ] Voice notes (not supported, graceful failure)

// 6. BUSINESS HOURS
[ ] Order outside business hours (7am-9pm)
[ ] Auto-reply with "Tutawasiliana asubuhi"
[ ] Daily summary at 18:00 (not before/after)
[ ] Reminders at 09:00 (not midnight)

// 7. PAYMENT EDGE CASES
[ ] Overpayment (amount > outstanding)
[ ] Underpayment (partial)
[ ] Payment to wrong till number
[ ] Customer pays twice (idempotency)
[ ] Payment without order (orphaned)

// 8. MERCHANT MISTAKES
[ ] Incorrect order (correction flow)
[ ] Wrong price (merchant always wins)
[ ] Forgot to record manual payment
[ ] Wants to cancel paid order (refund flow)

// 9. CONCURRENCY
[ ] Two orders from same customer simultaneously
[ ] Payment callback arrives before order created
[ ] Merchant corrects order while customer paying
[ ] Multiple reminders sent (debounce)

// 10. DATA INTEGRITY
[ ] Negative amounts blocked
[ ] Future dates blocked
[ ] Invalid phone numbers rejected
[ ] SQL injection attempts blocked
[ ] XSS attempts sanitized
```

---

## 📋 EFFICIENT TEST EXECUTION PLAN

### **Day 1: Automated Tests** (2 hours)
```bash
# Run all existing automated tests
cd supabase/functions
deno test _tests/*.test.ts -A

# Expected: 47/47 passing (already done)
```

### **Day 2: Manual Composition Tests** (2 hours)
```bash
# Test each of the 7 patterns manually
# Focus on: WhatsApp flow, QR flow, Restaurant flow, Daily summary
# Use test scripts above
```

### **Day 3: Workflow Tests** (2-3 hours)
```bash
# Run Kamau workflow (most critical)
# Run 2-3 other workflows
# Document any issues
```

### **Day 4: Edge Cases** (2 hours)
```bash
# Test Kenya-specific scenarios
# Network issues, WhatsApp shutdown, M-Pesa failures
# Low-end device testing (real phone or emulator)
```

---

## ✅ TEST COMPLETION CHECKLIST

### **Phase 1: Capabilities** (10/10)
- [x] Message parsing (47 tests passing)
- [x] Business routing (47 tests passing)
- [x] Order management (47 tests passing)
- [x] Payment processing (47 tests passing)
- [ ] Communication channels (partial - add SMS manual test)
- [ ] Merchant dashboard (manual UI test needed)
- [ ] Automation (manual trigger test needed)
- [x] Event sourcing (47 tests passing)
- [x] Financial foundation (47 tests passing)
- [x] Security (47 tests passing)

### **Phase 2: Compositions** (7/7)
- [x] WhatsApp order flow (e2e test passing)
- [x] QR order flow (mpesa-callback test passing)
- [x] Restaurant with modifiers (whatsapp-webhook test passing)
- [ ] Daily summary (manual test needed)
- [ ] Payment reminders (manual test needed)
- [ ] Real-time dashboard (manual UI test needed)
- [x] Partner credit check (partner-gateway test passing)

### **Phase 3: Workflows** (8/8)
- [ ] Mini-supermarket (Kamau) - CRITICAL
- [ ] Restaurant
- [ ] QR-first shop
- [ ] Invoice payment
- [ ] Multi-location
- [ ] Credit/debt management
- [ ] Customer retention
- [ ] Business health monitoring

### **Phase 4: Edge Cases** (10/10)
- [ ] Network issues
- [ ] WhatsApp shutdown
- [ ] M-Pesa issues
- [ ] Low-end devices
- [ ] Language & literacy
- [ ] Business hours
- [ ] Payment edge cases
- [ ] Merchant mistakes
- [ ] Concurrency
- [ ] Data integrity

---

## 📊 TEST REPORT TEMPLATE

```markdown
# Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Duration**: [X hours]

## Summary
- Total tests planned: 50
- Tests executed: X
- Tests passed: X
- Tests failed: X
- Success rate: X%

## Failures
1. [Test name] - [Reason] - [Priority: High/Med/Low]
2. ...

## Kenya-Specific Issues
1. [Issue] - [Impact] - [Workaround]
2. ...

## Recommendations
1. [Action item]
2. ...

## Next Steps
1. Fix critical failures
2. Re-run failed tests
3. Update documentation
```

---

## 🚀 QUICK START (Next Steps)

### **Option 1: Full Test Suite** (8 hours)
```bash
# Day 1: Automated (already done)
cd supabase/functions && deno test _tests/*.test.ts -A

# Day 2: Compositions (2 hrs)
./scripts/test-compositions.sh

# Day 3: Workflows (3 hrs)
./scripts/test-workflows.sh

# Day 4: Edge cases (2 hrs)
./scripts/test-edge-cases.sh
```

### **Option 2: Critical Path Only** (3 hours)
```bash
# Focus on Kamau workflow + edge cases
./scripts/test-kamau-workflow.sh
./scripts/test-kenya-edge-cases.sh
```

### **Option 3: Pre-Deployment Smoke Test** (30 min)
```bash
# Just verify it works before going live
./scripts/smoke-test.sh
```

---

**Test smart. Test what matters. Ship to Kamau! 🇰🇪🚀**
