# 🔒 KENYA COMMERCE OS - LOCKED SPECIFICATION

**Version:** 1.0  
**Frozen Date:** January 16, 2026  
**Status:** IMMUTABLE (Changes require documented blocker + explicit approval)

---

## 🎯 PURPOSE

This specification defines the **immutable core constraints** for Kenya Commerce OS. These rules protect:
- Audit trail integrity (dispute-grade evidence)
- Nairobi-specific design decisions (M-Pesa, WhatsApp, offline-first)
- Multi-tenant data isolation
- Merchant trust (merchant corrections always win)

**Any deviation from this spec must be approved by the architect (you) and documented in BUILD-LOG.md with justification.**

---

## 🧭 ARCHITECTURE SUMMARY (OPINIONATED)

- **Immutable core:** `commerce_events` is append-only and is the audit source of truth.
- **Operational state:** `orders` and `payments` are explicit tables derived from events and updated for fast reads + balance tracking.
- **Primary channels:** WhatsApp (orders) and M-Pesa (payments) are the default paths; other channels are secondary.

### **Sequence (Text Diagram)**
```
Customer WhatsApp message
  → whatsapp-webhook logs commerce_events (whatsapp_message_in)
  → order created (orders table)
  → merchant triggers generate-payment-link
  → STK Push sent to customer
  → mpesa-callback logs commerce_events (mpesa_payment_callback)
  → payment recorded + order outstanding_amount updated
  → Daily summary (Day 8+)
```

---

## 🗄️ CORE SCHEMA (FROZEN)

### **Table 1: businesses**
Multi-tenant merchant accounts

```sql
CREATE TABLE businesses (
    id TEXT PRIMARY KEY,              -- Human-readable slug (e.g., 'elixosense')
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    owner_email TEXT,
    whatsapp_number TEXT,
    sms_number TEXT,
    mpesa_shortcode TEXT,
    mpesa_paybill TEXT,
    mpesa_till_number TEXT,
    language_default TEXT DEFAULT 'sw',
    timezone TEXT DEFAULT 'Africa/Nairobi',
    currency TEXT DEFAULT 'KES',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Constraints:**
- Every table references `business_id` (tenant isolation)
- Row Level Security (RLS) enforces data isolation
- `config` stores business-specific parser rules, auto-responses, etc.

---

### **Table 2: orders**
Explicit order records (not just derived from events)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    total_amount NUMERIC(12, 2) NOT NULL,
    outstanding_amount NUMERIC(12, 2) NOT NULL,  -- Tracks unpaid balance
    is_credit BOOLEAN DEFAULT FALSE,
    payment_terms TEXT,                           -- "7 days", "COD", etc.
    items JSONB DEFAULT '[]'::jsonb,              -- [{product, qty, price}]
    delivery_address TEXT,
    delivery_instructions TEXT,
    status TEXT DEFAULT 'pending',                -- 'pending', 'paid', 'partial', 'fulfilled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT outstanding_positive CHECK (outstanding_amount >= 0),
    CONSTRAINT total_positive CHECK (total_amount > 0)
);

-- Auto-set outstanding_amount on insert
CREATE OR REPLACE FUNCTION set_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outstanding_amount IS NULL THEN
        NEW.outstanding_amount = NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_outstanding
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_outstanding_amount();
```

**Constraints:**
- `outstanding_amount` defaults to `total_amount` on insert
- Reduced by payments (see `record_payment` logic)
- NEVER negative (CHECK constraint)
- Merchant can correct via `manual_correction` event

---

### **Table 3: payments**
Explicit payment records (linked to orders)

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    order_id UUID REFERENCES orders(id),
    customer_phone TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    applied_amount NUMERIC(12, 2) NOT NULL,       -- Amount applied to order
    method TEXT NOT NULL,                          -- 'mpesa', 'cash', 'bank'
    mpesa_receipt TEXT,                            -- M-Pesa receipt number
    mpesa_transaction_id TEXT,                     -- M-Pesa transaction ID
    status TEXT DEFAULT 'confirmed',               -- 'confirmed', 'pending', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT applied_positive CHECK (applied_amount >= 0),
    CONSTRAINT mpesa_receipt_unique UNIQUE (business_id, mpesa_receipt)
);
```

**Constraints:**
- `applied_amount` is how much was applied to an order (may differ from `amount` if overpayment)
- `mpesa_receipt` must be unique per business (idempotency)
- Duplicate M-Pesa callbacks rejected silently (ON CONFLICT DO NOTHING behavior)

---

### **Table 4: commerce_events**
Append-only event log (single source of truth for audit)

```sql
CREATE TABLE commerce_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    event_type TEXT NOT NULL,                      -- LOCKED: 6 types only
    event_subtype TEXT,
    source_channel TEXT NOT NULL,                  -- 'whatsapp', 'mpesa', 'sms', 'web', 'manual'
    source_id TEXT,                                -- External ID (message_id, transaction_id)
    customer_phone TEXT,
    customer_name TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status TEXT DEFAULT 'pending',
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT event_type_locked CHECK (
        event_type IN (
            'whatsapp_message_in',
            'whatsapp_message_out',
            'mpesa_payment_callback',
            'manual_correction',
            'customer_proof',
            'merchant_note'
        )
    )
);

-- Idempotency: ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX commerce_events_idempotency_idx ON commerce_events(idempotency_key);
```

**LOCKED EVENT TYPES (6 ONLY):**
1. **`whatsapp_message_in`** - Inbound WhatsApp message from customer
2. **`whatsapp_message_out`** - Outbound WhatsApp message to customer
3. **`mpesa_payment_callback`** - M-Pesa STK callback received
4. **`manual_correction`** - Merchant corrected order/payment
5. **`customer_proof`** - Customer uploaded receipt/proof image
6. **`merchant_note`** - Merchant added internal note

**Why locked?**
- Prevents agent drift (no new event types without approval)
- Simplifies audit queries
- Ensures compliance with immutable principle

---

## 🔐 BUSINESS RULES (FROZEN)

### **Rule 1: Merchant Corrections Always Win**
```
IF merchant corrects order:
    - Update order with new values
    - Log as manual_correction event
    - NEVER reject or question
    - Show correction in audit trail

Rationale: Merchants know their business better than system.
Nairobi reality: Cash payments, verbal agreements, custom deals.
```

### **Rule 2: Idempotency Everywhere**
```
IF duplicate webhook/callback received:
    - Check idempotency_key or source_id
    - If exists: Return success (do nothing)
    - If new: Process normally

Rationale: Unreliable networks cause retries.
M-Pesa and WhatsApp both retry failed webhooks.
```

### **Rule 3: Partial Payments Allowed**
```
IF payment amount < order outstanding_amount:
    - Reduce outstanding_amount by payment amount
    - Keep order status as 'partial'
    - Allow multiple payments until outstanding = 0

Rationale: Nairobi merchants accept installment payments.
Street commerce often has "pay what you can" arrangements.
```

### **Rule 4: Offline-First (PWA)**
```
IF merchant is offline:
    - Store actions in IndexedDB queue
    - Show clear "Offline" status
    - On reconnect: Sync queue (oldest first)
    - Retry failed actions with exponential backoff

Rationale: Nairobi network is unreliable.
Power outages are common.
Merchants need to work regardless of connectivity.
```

### **Rule 5: Append-Only Events**
```
NEVER delete from commerce_events.
NEVER update existing event records.
ON CONFLICT: DO NOTHING (idempotent insert).

Rationale: Audit trail must be tamper-proof.
Disputes may arise months later.
KRA may request transaction history.
```

### **Rule 6: Nairobi Business Hours**
```
Automated actions (SMS, reminders) only between:
    07:00 - 20:00 EAT (UTC+3)

Rationale: Respect merchant sleep schedules.
Most Nairobi SMEs close by 8 PM.
No notifications after hours unless urgent.
```

---

## 📱 INTEGRATION CONSTRAINTS (FROZEN)

### **WhatsApp Business API**
```yaml
CATEGORIES_ALLOWED:
  - UTILITY (order confirmations, payment links) ✅
  - SERVICE (customer support) ✅
  - MARKETING (promotions) ⚠️ Costs $0.0157/msg outside 24h window

TEMPLATE_RULES:
  - Pre-approval required for templates
  - No images in automated messages (triggers promotional flag)
  - Use text-only for payment links
  - Include opt-out option

RATE_LIMITS:
  - 1000 messages per day (per business phone number)
  - If exceeded: Fallback to SMS

SIGNATURE_VERIFICATION:
  - All webhooks must verify X-Hub-Signature-256
  - Reject unverified requests with 403
```

### **M-Pesa Daraja API**
```yaml
STK_PUSH_LIMITS:
  - Max amount: 150,000 KES per transaction
  - Timeout: 60 seconds (customer must enter PIN)
  - Retry: If timeout, can retry after 5 minutes

CALLBACK_RULES:
  - Verify callback source (Safaricom IPs or shared secret)
  - Idempotency: Check TransactionID before inserting
  - ResultCode 0 = success, anything else = failure
  - Log all callbacks to commerce_events

TESTING:
  - Sandbox: https://sandbox.safaricom.co.ke
  - Test phone: 254708374149 (Daraja test number)
  - Test shortcode: 174379
```

### **SMS Fallback (Africastalking)**
```yaml
TRIGGERS:
  - WhatsApp message fails to send
  - WhatsApp account blocked/suspended
  - Customer phone not on WhatsApp

COST:
  - ~0.80 KES per SMS in Kenya
  - Track usage to avoid merchant surprise bills

FORMAT:
  - Keep messages under 160 characters (1 SMS unit)
  - No special characters (may break encoding)
  - Include merchant name for context
```

---

## 🌍 NAIROBI-SPECIFIC CONSTRAINTS (FROZEN)

### **Network Assumptions**
- Intermittent connectivity (offline-first mandatory)
- 2G/3G common (optimize for low bandwidth)
- Mobile data expensive (minimize payload sizes)
- Power outages common (IndexedDB persistence critical)

### **Payment Assumptions**
- M-Pesa is default (95% of transactions)
- Cash on delivery still common (manual verification)
- Bank transfers rare but possible (manual verification)
- Partial payments normal (installments)

### **Device Assumptions**
- Small screens (5" or less common)
- Low-end Android devices (limited RAM)
- No desktop access (mobile-first UI mandatory)
- Touch-first interaction (no mouse-dependent features)

### **Literacy Assumptions**
- Swahili primary language (English secondary)
- Low digital literacy (simple UI, clear labels)
- Verbal agreements common (manual corrections expected)
- Written records less common (system must track everything)

---

## 🧾 COMPLIANCE STANCE (MINIMAL VIABLE FOR PILOT)

### What We Have
- Data promise to merchants (`docs/DATA-PROMISE.md`)
- WhatsApp policy guards (code-level prevention)
- Full data export (CSV + JSON)
- Multi-tenant RLS isolation
- Audit trail (commerce_events append-only)

### What We Don't Have (Yet)
- ODPC registration (required at 100+ merchants)
- Formal DPA (not needed for pilot)
- Enterprise compliance frameworks (overkill for duka)

### Nairobi Reality Check
- Kamau cares about: payments working, data safe, system reliable
- Kamau doesn't care about: 40-page legal docs, compliance theater
- Real risk: WhatsApp suspension (we guard against this)
- Low risk: ODPC audit (pilot is too small to matter)

### Compliance Timeline
- Days 5-7: M-Pesa payments (critical)
- Days 8-11: Resilience (offline, SMS fallback)
- Day 12: ODPC registration email sent (5 min task)
- Day 13-14: Pilot feedback (real users teach us)
- Month 2: Formal compliance if we hit 50+ merchants

---

## 🚫 NON-GOALS (EXPLICITLY EXCLUDED FROM V1)

These are NOT in scope for initial launch:

```yaml
EXCLUDED_FEATURES:
  - Multi-user accounts (only business owner)
  - Advanced inventory management (simple counts only)
  - Customer loyalty programs (basic points in v1.1)
  - Delivery tracking (basic status only)
  - Analytics dashboards (basic summary only)
  - Multi-language beyond Swahili/English
  - Integration with accounting software (CSV export only)
  - API for third-party developers (v2.0)
  - Mobile apps (PWA is sufficient for v1)
  - Voice calls (WhatsApp/SMS text only)

RATIONALE:
  - Keep v1 simple and shippable
  - Validate core workflow first
  - Add features based on merchant feedback
  - Avoid scope creep and delays
```

---

## ✅ VALIDATION CHECKLIST

Before any code is deployed, verify:

### **Schema Compliance**
- [ ] Only 4 core tables (businesses, orders, payments, commerce_events)
- [ ] Only 6 event types in commerce_events
- [ ] outstanding_amount defaults to total_amount
- [ ] mpesa_receipt has unique constraint
- [ ] idempotency_key enforced

### **Business Rules Compliance**
- [ ] Merchant corrections never rejected
- [ ] Duplicate webhooks handled gracefully
- [ ] Partial payments reduce outstanding_amount
- [ ] Offline actions persist in IndexedDB
- [ ] No deletes from commerce_events

### **Integration Compliance**
- [ ] WhatsApp signature verified
- [ ] M-Pesa callbacks idempotent
- [ ] SMS fallback implemented
- [ ] Rate limits respected

### **Nairobi Compliance**
- [ ] Offline-first PWA works
- [ ] Mobile-responsive (tested on 5" screen)
- [ ] Swahili UI labels natural (not machine translated)
- [ ] Business hours respected (07:00-20:00 EAT)

---

## 🔒 CHANGE CONTROL

### **What Requires Approval**
- Adding new tables
- Adding new event types (beyond 6)
- Changing core business rules
- Modifying payment logic
- Removing idempotency checks
- Changing audit trail structure

### **What Doesn't Require Approval**
- UI improvements (keeping same functionality)
- Performance optimizations (no behavior change)
- Bug fixes (restoring spec behavior)
- Documentation updates
- Test additions
- Logging improvements

### **Approval Process**
1. Document blocker in BUILD-LOG.md
2. Propose change with rationale
3. Architect reviews (you)
4. If approved: Update SPEC.md version, document change
5. If rejected: Find alternative within spec

---

## 📊 SUCCESS METRICS (END OF DAY 14)

The system is complete when:

- ✅ All 4 tables deployed to Supabase
- ✅ Only 6 event types exist in commerce_events
- ✅ Merchant can create order via WhatsApp
- ✅ Customer receives STK Push payment link
- ✅ Payment callback reduces outstanding_amount
- ✅ Offline order syncs when online
- ✅ Merchant can export all data (CSV + JSON)
- ✅ Daily summary SMS sent at 19:30 EAT
- ✅ Legal docs displayed + consent collected
- ✅ ElixoSense pilot merchant successfully onboarded

---

**This specification is locked. Build within these constraints. Launch when these constraints are met. 🚀**

**Last Updated:** January 16, 2026  
**Next Review:** Day 14 (January 30, 2026) - post-launch evaluation
