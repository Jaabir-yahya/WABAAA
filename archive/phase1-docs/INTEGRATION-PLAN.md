# 🔄 INTEGRATION PLAN: Kenya Commerce OS
## Hybrid Foundation → 14-Day Agent Workflow

**Created:** January 16, 2026  
**Status:** Ready to Execute  
**Approach:** Hybrid (Preserve event-sourced foundation + Add locked spec tables)

---

## 📋 EXECUTIVE SUMMARY

### What We're Doing
Integrating our flexible event-sourced foundation with the proven 14-day Kenya Commerce OS build plan by:
1. Adding explicit `orders` and `payments` tables alongside `commerce_events`
2. Mapping 6 locked event types to our flexible model
3. Adopting strict agent workflow discipline
4. Using ElixoSense as first real pilot merchant

### What We're Preserving
- ✅ Multi-tenant architecture (`business_id` everywhere)
- ✅ Event-sourced audit trail (`commerce_events` table)
- ✅ NairobiChaosParser (WhatsApp → Orders)
- ✅ Offline-first PWA foundation
- ✅ Swahili-first UI components

### What We're Adding
- ✅ Explicit `orders` and `payments` tables (spec invariants)
- ✅ 6 locked event types (strict audit model)
- ✅ Frozen SPEC.md (immutable core constraints)
- ✅ Daily BUILD-LOG.md discipline
- ✅ Agent boundary enforcement

---

## 🗄️ SCHEMA RECONCILIATION

### Current Foundation (What We Built)
```sql
commerce_events (flexible, JSONB payload)
  ↓ materialized views ↓
customers_view, orders_view, payments_view
```

### Hybrid Model (Integration Target)
```sql
-- Core immutable tables
businesses (tenant config)
orders (explicit order records with outstanding_amount)
payments (explicit payment records with applied_amount)
commerce_events (event log with 6 locked types)

-- Views (keep our current ones)
customers_view (unchanged)
orders_view (now references orders table)
payments_view (now references payments table)
```

### Migration Strategy
1. **Keep** `0001_create_commerce_events.sql` (already has right structure)
2. **Keep** `0002_create_businesses.sql` (already multi-tenant ready)
3. **Modify** `0003_create_views.sql` → Add explicit orders/payments tables first
4. **Add** `0004_create_locked_event_types.sql` → Enforce 6 event types
5. **Keep** `0004_create_auth_tables.sql` → Rename to 0005

---

## 📐 LOCKED SPEC DEFINITION

### Core Invariants (FROZEN - Never Change Without Blocker)

```yaml
IMMUTABLE_TABLES:
  businesses:
    fields: [id, name, owner_phone, mpesa_till, whatsapp_number, config]
    constraints: "Multi-tenant isolation via business_id"
  
  orders:
    fields: [id, business_id, customer_phone, total_amount, outstanding_amount, is_credit, payment_terms]
    constraints: "outstanding_amount tracks remaining balance"
    logic: "Merchant corrections always win (manual_correction event)"
  
  payments:
    fields: [id, business_id, order_id, amount, applied_amount, method, status]
    constraints: "applied_amount tracks what was applied to order"
    logic: "Idempotent (same mpesa_receipt only once)"
  
  commerce_events:
    fields: [id, business_id, event_type, source_id, payload, idempotency_key]
    constraints: "ON CONFLICT DO NOTHING (idempotent)"
    event_types: [whatsapp_message_in, whatsapp_message_out, mpesa_payment_callback, manual_correction, customer_proof, merchant_note]

LOCKED_EVENT_TYPES:
  - whatsapp_message_in    # Inbound WhatsApp message
  - whatsapp_message_out   # Outbound WhatsApp message
  - mpesa_payment_callback # M-Pesa STK callback
  - manual_correction      # Merchant overrides order/payment
  - customer_proof         # Customer uploads receipt/proof
  - merchant_note          # Merchant adds internal note

BUSINESS_RULES:
  - Merchant corrections NEVER rejected
  - Partial payments allowed (reduce outstanding_amount)
  - M-Pesa callbacks idempotent (same TransactionID = no-op)
  - WhatsApp messages logged before parsing
  - Offline changes synced when online (IndexedDB queue)
  - Export available (CSV + JSON, all data)

NAIROBI_CONSTRAINTS:
  - Business hours: 07:00–20:00 EAT (for automated actions)
  - WhatsApp templates: UTILITY category only (free within 24h window)
  - M-Pesa limits: ~150K KES per transaction
  - SMS fallback: Africastalking (if WhatsApp blocked)
  - Network: Assume intermittent (offline-first PWA)
```

---

## 📅 14-DAY TIMELINE MAPPING

### What We've Already Completed ✅
- **Day 0.5**: Project restructure (pivot complete)
- **Day 1 (50%)**: Core schema exists, needs adjustment for explicit tables
- **Day 3 (30%)**: PWA skeleton built, needs offline sync hardening

### Adjusted Timeline (Days 1-14)

#### **DAY 1: SCHEMA ADJUSTMENT (Today - 4 hours)**
**Status:** 50% complete, need to add explicit tables

**Tasks:**
- [ ] Create new migration: `0003_create_explicit_orders_payments.sql`
- [ ] Add `orders` table with `outstanding_amount`, `is_credit`, `payment_terms`
- [ ] Add `payments` table with `applied_amount`, `mpesa_receipt`, `status`
- [ ] Add CHECK constraint on `commerce_events.event_type` (6 types only)
- [ ] Test: Insert order, verify outstanding_amount defaults to total_amount
- [ ] Test: Insert payment, verify applied_amount reduces outstanding_amount
- [ ] Test: Insert duplicate event, verify ON CONFLICT DO NOTHING works
- [ ] Create SPEC.md (frozen spec document)
- [ ] Create BUILD-LOG.md (start daily logging)

**Deliverable:**
- ✅ Hybrid schema deployed to Supabase
- ✅ All tests passing
- ✅ SPEC.md frozen
- ✅ BUILD-LOG.md started

---

#### **DAY 2: API LAYER (Tomorrow - 4 hours)**
**Status:** Not started

**Tasks:**
- [ ] Create Supabase Edge Function: `create_order`
  - Input: business_id, customer_phone, items[], total_amount, is_credit
  - Logic: Insert into `orders`, log to `commerce_events`
  - Return: order_id, outstanding_amount
- [ ] Create Edge Function: `record_payment`
  - Input: order_id, amount, mpesa_receipt
  - Logic: Insert `payments`, reduce `orders.outstanding_amount`
  - Idempotency: Check `mpesa_receipt` in existing payments
- [ ] Create Edge Function: `correct_order`
  - Input: order_id, correction_type, new_value, reason
  - Logic: Update order, log `manual_correction` event
  - Rule: NEVER reject (merchant always wins)
- [ ] Create Edge Function: `get_order_summary`
  - Input: business_id, date_range
  - Return: Total orders, paid, outstanding, daily breakdown
- [ ] Write tests for all 4 endpoints

**Deliverable:**
- ✅ 4 API endpoints working
- ✅ Idempotency verified
- ✅ Tests passing
- ✅ API docs updated

---

#### **DAY 3: OFFLINE PWA HARDENING (4 hours)**
**Status:** 30% complete (skeleton exists, needs sync logic)

**Tasks:**
- [ ] Implement IndexedDB queue
  - Store: pending orders, payments, corrections
  - Schema: `{ action, data, timestamp, retry_count }`
- [ ] Service Worker sync logic
  - Detect online/offline
  - On online: Process queue (oldest first)
  - On success: Remove from queue
  - On failure: Increment retry_count, exponential backoff
- [ ] Add sync status UI
  - Show: "Offline (3 pending)", "Syncing...", "Synced ✓"
  - Button: "Retry Sync Now"
- [ ] Test scenarios:
  - Create order offline → Go online → Verify synced
  - Create 5 orders offline → Power failure → Restart → Verify persist
  - Duplicate network packet → Verify idempotency
- [ ] Mobile testing (2G throttling)

**Deliverable:**
- ✅ Offline sync working
- ✅ IndexedDB persists across browser restart
- ✅ Sync status clear to user
- ✅ Tested on slow network

---

#### **DAY 4: WHATSAPP WEBHOOK (3 hours)**
**Status:** Parser exists, needs webhook handler

**Tasks:**
- [ ] Create Edge Function: `whatsapp_ingest`
  - Verify X-Hub-Signature-256 (Meta webhook security)
  - Extract: message_id, from (phone), text, timestamp
  - Call NairobiChaosParser: `parser.parse(text)`
  - If parsed: Create order, log `whatsapp_message_in` event
  - If failed: Create draft order, reply with example
  - Idempotency: Check `source_id` (message_id) in commerce_events
- [ ] Test with Meta webhook simulator
- [ ] Configure webhook URL in Meta dashboard
- [ ] Test end-to-end: Send WhatsApp message → Verify order created

**Deliverable:**
- ✅ WhatsApp webhook live
- ✅ Orders created from messages
- ✅ Parser handles Swahili/English
- ✅ Failed parses create draft orders

---

#### **DAY 5: M-PESA STK PUSH (3 hours)**
**Status:** Client exists, needs integration

**Tasks:**
- [ ] Create Edge Function: `generate_payment_link`
  - Input: order_id
  - Get order details (customer_phone, outstanding_amount)
  - Call MPesaClient.stkPush()
  - Return: STK initiated status
  - Log: `mpesa_stk_initiated` event
- [ ] Handle errors:
  - Phone invalid → Return clear message
  - Amount too large → Return M-Pesa limit warning
  - Network failure → Queue for retry
- [ ] Test with Daraja sandbox
- [ ] Test: Send STK to your own phone, verify prompt appears

**Deliverable:**
- ✅ Payment link generation working
- ✅ Customer receives STK prompt
- ✅ Error handling tested
- ✅ Logged to commerce_events

---

#### **DAY 6: M-PESA CALLBACK (3 hours)**
**Status:** Client exists, needs callback handler

**Tasks:**
- [ ] Create Edge Function: `mpesa_callback`
  - Verify signature (Safaricom shared secret)
  - Parse callback: TransactionID, Phone, Amount, ResultCode
  - Extract order_id from AccountReference
  - If success (ResultCode = 0):
    - Insert payment with applied_amount
    - Reduce orders.outstanding_amount
    - Log `mpesa_payment_callback` event
  - If failure: Log error, notify merchant
  - Idempotency: Check TransactionID in payments
- [ ] Configure callback URL in Daraja portal
- [ ] Test with mock callback
- [ ] Test duplicate callback (verify idempotency)

**Deliverable:**
- ✅ Payment callbacks processed
- ✅ Orders marked paid correctly
- ✅ Partial payments supported
- ✅ Idempotency verified

---

#### **DAY 7: INTEGRATION CHECKPOINT (3 hours)**
**Status:** Not started

**Tasks:**
- [ ] End-to-end test:
  1. Create order via WhatsApp
  2. Generate payment link (STK Push)
  3. Complete payment on phone
  4. Verify callback received
  5. Verify order.outstanding_amount reduced
  6. Verify all events logged correctly
- [ ] Test error scenarios:
  - WhatsApp webhook fails → Retry logic
  - M-Pesa callback delayed → Eventually consistent
  - Offline order → Online sync → Payment → All match
- [ ] Review BUILD-LOG.md
- [ ] Identify any gaps

**Deliverable:**
- ✅ Full flow working (WhatsApp → Payment → Confirmation)
- ✅ No data loss or duplication
- ✅ Error recovery tested

---

#### **DAY 8: DAILY SUMMARY WORKFLOW (2 hours)**
**Status:** Not started

**Tasks:**
- [ ] Create Edge Function: `generate_daily_summary`
  - Input: business_id, date
  - Query: All orders for date
  - Calculate: Total sales, paid, outstanding, order count
  - Return: JSON summary
- [ ] Create scheduled function (Supabase Cron or Edge Function)
  - Trigger: Daily at 19:30 EAT (after business hours)
  - For each business: Generate summary
  - Send SMS via Africastalking
  - Format: "Leo: KSh 15,200 (12 oda, 8 zimelipwa, 4 zinasubiri)"
- [ ] Test with 5 orders, 3 payments

**Deliverable:**
- ✅ Daily summary SMS sent at 19:30
- ✅ Accurate totals
- ✅ Swahili format clear

---

#### **DAY 9: DATA EXPORT (2 hours)**
**Status:** Not started

**Tasks:**
- [ ] Create Edge Function: `export_orders_csv`
  - Return: CSV with all orders
  - Columns: order_id, date, customer, total, paid, outstanding
- [ ] Create Edge Function: `export_payments_csv`
  - Return: CSV with all payments
- [ ] Create Edge Function: `export_events_json`
  - Return: JSON with all commerce_events (audit trail)
- [ ] Add "Export Data" button to merchant dashboard
- [ ] Test: Export → Open in Excel → Verify readable

**Deliverable:**
- ✅ Merchant can export orders (CSV)
- ✅ Merchant can export payments (CSV)
- ✅ Merchant can export events (JSON)
- ✅ Formats verified

---

#### **DAY 10: OFFLINE SYNC STRESS TEST (3 hours)**
**Status:** Not started

**Tasks:**
- [ ] Test: 2-hour power outage simulation
  - Create 5 orders offline
  - Close browser
  - Reopen browser (verify IndexedDB persists)
  - Go online
  - Verify all 5 orders sync
- [ ] Test: Slow network (2G throttling)
  - Create order on slow connection
  - Verify timeout handling
  - Verify retry logic works
- [ ] Test: Sync conflict
  - Create order offline (amount = 1000)
  - Merchant corrects online (amount = 1200)
  - Sync offline order
  - Verify: Correction wins, conflict logged

**Deliverable:**
- ✅ Offline behavior robust
- ✅ No data loss under stress
- ✅ Sync queue recovers gracefully

---

#### **DAY 11: SMS FALLBACK (2 hours)**
**Status:** Not started

**Tasks:**
- [ ] Set up Africastalking account (Kenya)
- [ ] Create Edge Function: `send_sms_fallback`
  - Input: phone, message
  - Call Africastalking API
  - Log: `sms_sent` event
- [ ] Implement fallback logic:
  - If WhatsApp send fails → Trigger SMS fallback
  - Message: "Malipo: Lipa KSh X kwa M-Pesa till XXXX"
- [ ] Test: Block WhatsApp in DevTools → Verify SMS sent

**Deliverable:**
- ✅ SMS fallback working
- ✅ Triggered when WhatsApp fails
- ✅ Cost tracked

---

#### **DAY 12: LEGAL & COMPLIANCE (3 hours)**
**Status:** Not started

**Tasks:**
- [ ] Create legal documents:
  - Data Processing Agreement (DPA)
  - Privacy Policy (PDPA compliant)
  - Acceptable Use Policy
  - WhatsApp Policy Compliance Warning
  - SIM Swap Fraud Warning
  - Tax Compliance Disclaimer
- [ ] Add to onboarding flow:
  - Merchant sees warnings
  - Checkbox: "I understand"
  - Stored in business.config.legal_consent
- [ ] Start ODPC registration process
  - Email: datacommissioner@odpc.go.ke
  - Subject: "Data Controller Registration"
  - Timeline: 2-3 weeks

**Deliverable:**
- ✅ Legal docs complete
- ✅ Onboarding flow includes consent
- ✅ ODPC registration initiated

---

#### **DAY 13: ELIXOSENSE PILOT SETUP (2 hours)**
**Status:** Not started

**Tasks:**
- [ ] Create ElixoSense business account in database
  - Use real owner phone, WhatsApp, M-Pesa till
  - Load `clients/elixosense/config.json` into business.config
- [ ] Configure webhooks:
  - WhatsApp webhook URL: `/api/webhooks/whatsapp?business_id=elixosense`
  - M-Pesa callback URL: `/api/webhooks/mpesa?business_id=elixosense`
- [ ] Test with real ElixoSense phone:
  - Send WhatsApp order
  - Generate payment link
  - Complete payment
  - Verify order marked paid
- [ ] Collect feedback from owner

**Deliverable:**
- ✅ ElixoSense onboarded as pilot merchant
- ✅ Real orders tested
- ✅ Feedback documented

---

#### **DAY 14: FINAL VALIDATION (4 hours)**
**Status:** Not started

**Tasks:**
- [ ] Run full test suite
  - All API endpoints
  - Offline sync
  - WhatsApp → Payment flow
  - Data export
  - Legal compliance
- [ ] Load test (if possible):
  - Send 100 WhatsApp messages in 10 minutes
  - Verify all processed correctly
- [ ] Review BUILD-LOG.md
- [ ] Create launch checklist
- [ ] Decision: GO or NO-GO

**Deliverable:**
- ✅ All tests passing
- ✅ No critical bugs
- ✅ Ready for production
- ✅ Launch decision made

---

## 🔧 AGENT WORKFLOW DISCIPLINE

### Daily Routine (Every Day, Days 1-14)

#### **Morning (30 min)**
1. Review yesterday's BUILD-LOG.md entry
2. Check if any blockers emerged overnight
3. Plan today's tasks (pick from timeline above)
4. Set up Cursor session with SPEC boundary

#### **Work Session (4-6 hours)**
1. **Cursor Session Setup:**
   ```
   SPECIFICATION BOUNDARY (paste at top):
   - 4 core tables: businesses, orders, payments, commerce_events
   - 6 locked event types only
   - Merchant corrections always win
   - Idempotency everywhere
   - Offline-first PWA
   
   TODAY'S TASK: [specific from timeline]
   DONE WHEN: [exact deliverable]
   TESTS: [specific validation]
   ```

2. **Agent Work:**
   - Cursor implements task
   - Perplexity researches blockers (if any)
   - You validate output

3. **Testing:**
   - Run automated tests
   - Manual testing (especially mobile/offline)
   - Document results

#### **End of Day (30 min)**
1. Update BUILD-LOG.md:
   ```markdown
   ## Day X (Date)
   **Objective:** [What you planned]
   **Agent Work:** [What agents did]
   **Your Work:** [What you validated]
   
   ### Completed
   - ✅ Task 1
   - ✅ Task 2
   
   ### Blockers
   - Issue X (plan to resolve: Y)
   
   ### Tomorrow
   - [ ] Next task
   ```

2. Commit code to git
3. Update API docs (if endpoints changed)
4. Identify tomorrow's focus

---

## 📁 REQUIRED DOCUMENTS

### Create These Today (Day 1)

#### **SPEC.md** (Frozen Spec)
```markdown
# Kenya Commerce OS - Locked Specification

## IMMUTABLE CONSTRAINTS
[Copy from "Locked Spec Definition" above]

## FROZEN AFTER: January 16, 2026
Any changes require documented blocker + explicit approval.

## RATIONALE
This spec is locked to:
- Prevent scope creep
- Ensure Nairobi-specific design integrity
- Maintain audit trail requirements
- Enable agent workflow discipline
```

#### **BUILD-LOG.md** (Daily Progress)
```markdown
# Build Log: Kenya Commerce OS

## Day 1 (January 16, 2026)
**Objective:** Schema adjustment to hybrid model
**Status:** In Progress

[Update end of day]
```

#### **AGENT-BOUNDARIES.md** (Agent Rules)
```markdown
# Agent Boundaries: Kenya Commerce OS

## Cursor (Implementation Agent)
**CAN:**
- Implement code within spec
- Write tests
- Debug errors
- Suggest implementation details

**CANNOT:**
- Change core tables
- Add event types (6 only)
- Redesign data flow
- Override spec without asking

## Perplexity (Research Agent)
**CAN:**
- Validate APIs are current
- Research blockers
- Report evidence-based constraints

**CANNOT:**
- Suggest spec changes
- Recommend alternative architectures
- Override locked decisions

## Human (You - Architect)
**MUST:**
- Review all agent output
- Resolve ambiguities
- Approve schema changes
- Validate merchant UX
- Update BUILD-LOG.md daily
```

---

## 🚀 IMMEDIATE NEXT STEPS (Today)

### **Step 1: Create Frozen Spec (30 min)**
```bash
cd kenya-commerce-os
# I'll create SPEC.md for you
```

### **Step 2: Adjust Schema (2 hours)**
```bash
cd packages/database/migrations
# Create 0003_create_explicit_orders_payments.sql
# Add orders table
# Add payments table
# Add event type constraint
```

### **Step 3: Run Tests (30 min)**
```bash
# Deploy to Supabase
npm run migrate

# Verify tables exist
npm run studio

# Run validation tests
```

### **Step 4: Start BUILD-LOG.md (30 min)**
```bash
# Document Day 1 progress
# List completed tasks
# Note any blockers
```

---

## ✅ SUCCESS CRITERIA (End of Day 14)

### **Technical Deliverables**
- ✅ 4 core tables (businesses, orders, payments, commerce_events)
- ✅ 10+ Supabase Edge Functions (API layer)
- ✅ Offline-first PWA with IndexedDB sync
- ✅ WhatsApp integration (webhook + parser)
- ✅ M-Pesa integration (STK Push + callback)
- ✅ SMS fallback (Africastalking)
- ✅ Daily summary automation
- ✅ Data export (CSV + JSON)
- ✅ All tests passing

### **Compliance Deliverables**
- ✅ Legal docs (DPA, Privacy Policy, AUP)
- ✅ ODPC registration initiated
- ✅ Tax disclaimer displayed
- ✅ SIM swap warning shown
- ✅ WhatsApp policy compliance

### **Pilot Deliverables**
- ✅ ElixoSense onboarded as real merchant
- ✅ Real orders processed end-to-end
- ✅ Feedback collected
- ✅ Iteration plan for v1.1

---

## 🎯 DECISION CHECKPOINTS

### **Day 1 Checkpoint: Schema Approved?**
- Review hybrid schema
- Verify tests pass
- Approve or adjust

### **Day 4 Checkpoint: WhatsApp Integration Working?**
- Messages parsed correctly?
- Orders created?
- Continue or fix

### **Day 7 Checkpoint: Full Flow Working?**
- WhatsApp → Payment → Confirmation?
- Any critical bugs?
- Continue or address

### **Day 14 Checkpoint: GO or NO-GO?**
- All tests passing?
- Legal docs ready?
- Pilot merchant successful?
- Decision: Launch or extend timeline

---

## 📞 SUPPORT & ESCALATION

### **If Agents Get Stuck**
1. Check SPEC.md (is it clear?)
2. Check AGENT-BOUNDARIES.md (did they violate rules?)
3. Ask clarifying question (update spec if needed)
4. Document in BUILD-LOG.md

### **If Timeline Slips**
1. Identify blocker (technical? credential? time?)
2. Adjust timeline (be realistic)
3. Communicate new target
4. Don't skip testing to catch up

### **If Spec Violation Detected**
1. Identify what changed without approval
2. Revert code (`git revert`)
3. Re-brief agent with boundary prompt
4. Document in BUILD-LOG.md

---

## 🎉 YOU'RE READY TO START

**Action:** Run the next set of commands to create the foundation documents and begin Day 1.

All questions answered. Integration path clear. Let's build! 🚀
