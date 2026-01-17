# 🧹 CLEANUP & FOUNDATION SETUP PLAN

**Date:** January 16, 2026  
**Status:** Ready to Execute  
**Goal:** Clean redundant code, consolidate structure, set up Day 1 foundation

---

## 🔍 CURRENT STATE ANALYSIS

### **What We Have (Good ✅)**
```
repo-root/
├── SPEC.md                    ✅ Frozen spec (keep)
├── INTEGRATION-PLAN.md        ✅ 14-day plan (keep)
├── AGENT-BOUNDARIES.md        ✅ Agent rules (keep)
├── BUILD-LOG.md               ✅ Progress tracker (keep)
├── START-HERE.md              ✅ Command center (keep)
├── README.md                  ✅ Overview (keep)
├── packages/                  ✅ Core logic (keep)
│   ├── database/              ✅ Migrations (needs adjustment)
│   ├── core/                  ✅ Parser + Processor (keep)
│   └── integrations/          ✅ WhatsApp + M-Pesa (keep)
├── clients/                   ✅ ElixoSense config (keep)
└── docs/                      ✅ Documentation (keep)
```

### **What's Redundant (Clean 🧹)**
```
repo-root/
├── apps/
│   ├── merchant/              🔄 DUPLICATE (we have frontend/)
│   ├── admin/                 📁 EMPTY (delete for now)
│   └── customer/              📁 EMPTY (delete for now)
└── frontend/                  🔄 DUPLICATE (consolidate with apps/merchant)

ROOT LEVEL (outside kenya-commerce-os):
├── containerx/                ⚠️ OLD (already archived, can delete)
├── elixosense-whatsapp/       ⚠️ OLD (already archived, can delete)
└── docs/                      🔄 DUPLICATE (merged into repo-root/docs)
```

### **What's Missing (Add ➕)**
```
repo-root/
├── .gitignore                 ➕ Need proper ignore rules
├── .env.example               ➕ Environment variables template
└── packages/database/
    └── migrations/
        └── 0003_explicit_*.sql ➕ Day 1 task (hybrid schema)
```

---

## 🎯 CLEANUP STRATEGY

### **Phase 1: Root Level Cleanup (5 min)**
Delete old directories that are already archived:
```bash
# Delete old containerx (already in archive/)
rm -rf containerx

# Delete old elixosense-whatsapp (already in archive/)
rm -rf elixosense-whatsapp

# Delete old docs (already in repo-root/docs/)
rm -rf docs

# Keep only:
# - archive/ (reference)
# - humandocs/ (human context)
# - repo-root/ (active project)
```

### **Phase 2: Consolidate Frontend (10 min)**
Merge `apps/merchant/` and `frontend/` into single `apps/merchant/`:
```bash
cd kenya-commerce-os

# The merchant app is more complete, so:
# 1. Keep apps/merchant/ (has all components)
# 2. Delete frontend/ (redundant)
rm -rf frontend

# 3. Delete empty apps
rm -rf apps/admin apps/customer

# Result: Only apps/merchant/ remains
```

### **Phase 3: Add Missing Files (5 min)**
```bash
cd kenya-commerce-os

# 1. Create root .gitignore
# 2. Create root .env.example
# 3. Verify package.json is correct
```

---

## 📋 DETAILED CLEANUP STEPS

### **STEP 1: Root Level Cleanup**

**Execute:**
```bash
cd /Users/jaabirahmed/Documents/projects/WABAAA

# Verify archive exists (safety check)
ls -la archive/containerx-old
ls -la archive/elixosense-old

# Delete old directories
rm -rf containerx
rm -rf elixosense-whatsapp
rm -rf docs

# What remains:
# - archive/ (old code reference)
# - humandocs/ (human context)
# - repo-root/ (active project)
```

**Verify:**
```bash
ls -la
# Should see only:
# - archive/
# - humandocs/
# - repo-root/
```

---

### **STEP 2: Kenya Commerce OS Cleanup**

**Execute:**
```bash
cd kenya-commerce-os

# Delete redundant frontend
rm -rf frontend

# Delete empty placeholder apps
rm -rf apps/admin
rm -rf apps/customer

# What remains in apps/:
# - apps/merchant/ (complete React PWA)
```

**Verify:**
```bash
ls -la apps/
# Should see only: merchant/

ls -la apps/merchant/src/
# Should see: pages/, lib/, App.tsx, index.css, main.tsx
```

---

### **STEP 3: Add Missing Root Files**

**Execute:**
```bash
cd kenya-commerce-os

# Create .gitignore (I'll provide content)
# Create .env.example (I'll provide content)
# Verify package.json (already exists)
```

---

## 📄 FILES TO CREATE

### **1. Root .gitignore**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js
.npm-cache/

# Testing
coverage/
*.log

# Production
dist/
build/
.vercel/
.output/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Supabase
.supabase/
supabase/.temp/

# TypeScript
*.tsbuildinfo

# PWA
sw.js
sw.js.map
workbox-*.js
workbox-*.js.map

# Temporary files
*.tmp
tmp/
temp/
```

### **2. Root .env.example**
```bash
# ============================================
# KENYA COMMERCE OS - Environment Variables
# ============================================

# Copy this file to .env.local and fill in real values
# NEVER commit .env.local to git

# --------------------------------------------
# SUPABASE (Database + Auth + Functions)
# --------------------------------------------
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here  # Server-side only!

# Direct database connection (for migrations)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# --------------------------------------------
# WHATSAPP BUSINESS API (Meta)
# --------------------------------------------
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token-here
WHATSAPP_APP_SECRET=your-app-secret-here

# --------------------------------------------
# M-PESA DARAJA API (Safaricom)
# --------------------------------------------
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/webhooks/mpesa
MPESA_ENVIRONMENT=sandbox  # or 'production'

# --------------------------------------------
# SMS FALLBACK (Africastalking)
# --------------------------------------------
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_SENDER_ID=your-sender-id

# --------------------------------------------
# BUSINESS CONFIGURATION
# --------------------------------------------
DEFAULT_BUSINESS_ID=elixosense
DEFAULT_TIMEZONE=Africa/Nairobi
DEFAULT_LANGUAGE=sw

# --------------------------------------------
# DEPLOYMENT
# --------------------------------------------
NODE_ENV=development  # or 'production'
VERCEL_URL=your-app.vercel.app  # Auto-set by Vercel
```

---

## 🔧 POST-CLEANUP VERIFICATION

### **After Cleanup, Verify Structure:**
```bash
cd /Users/jaabirahmed/Documents/projects/WABAAA

tree -L 2 -I 'node_modules|.git'
```

**Expected Result:**
```
.
├── archive/
│   ├── containerx-old/
│   └── elixosense-old/
├── humandocs/
│   ├── CONTAINERX_CONTEXT.md
│   ├── KENYA_COMMERCE_OS_CONTEXT_DUMP.md
│   └── ...
└── repo-root/
    ├── .gitignore              ← NEW
    ├── .env.example            ← NEW
    ├── SPEC.md
    ├── INTEGRATION-PLAN.md
    ├── AGENT-BOUNDARIES.md
    ├── BUILD-LOG.md
    ├── START-HERE.md
    ├── README.md
    ├── package.json
    ├── apps/
    │   └── merchant/           ← ONLY THIS
    ├── packages/
    │   ├── database/
    │   ├── core/
    │   └── integrations/
    ├── clients/
    │   ├── elixosense/
    │   └── template/
    └── docs/
```

---

## 🚀 DAY 1 FOUNDATION SETUP

After cleanup, proceed with Day 1 tasks:

### **Task 1: Set Up Supabase Project (30 min)**

```bash
cd repo-root/packages/database

# Install dependencies
npm install

# Initialize Supabase (if not done)
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Or create new project
supabase projects create kenya-commerce-os --region us-east-1
```

### **Task 2: Create Hybrid Schema Migration (2 hours)**

Create: `packages/database/migrations/0003_create_explicit_orders_payments.sql`

**Content:**
```sql
-- Migration: Add explicit orders and payments tables
-- Created: January 17, 2026
-- Description: Hybrid model (event-sourced + explicit tables)

-- ============================================================================
-- ORDERS TABLE (Explicit order records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    
    -- Amounts
    total_amount NUMERIC(12, 2) NOT NULL,
    outstanding_amount NUMERIC(12, 2) NOT NULL,  -- Tracks unpaid balance
    
    -- Credit terms
    is_credit BOOLEAN DEFAULT FALSE,
    payment_terms TEXT,  -- "7 days", "COD", "NET 30", etc.
    
    -- Order details
    items JSONB DEFAULT '[]'::jsonb,  -- [{product, qty, unit, price}]
    delivery_address TEXT,
    delivery_instructions TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',  -- 'pending', 'paid', 'partial', 'fulfilled'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT outstanding_positive CHECK (outstanding_amount >= 0),
    CONSTRAINT total_positive CHECK (total_amount > 0)
);

-- Indexes
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_customer ON orders(customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

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

-- ============================================================================
-- PAYMENTS TABLE (Explicit payment records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    order_id UUID REFERENCES orders(id),  -- Can be NULL (unlinked payment)
    customer_phone TEXT NOT NULL,
    
    -- Amounts
    amount NUMERIC(12, 2) NOT NULL,
    applied_amount NUMERIC(12, 2) NOT NULL,  -- Amount applied to order
    
    -- Payment details
    method TEXT NOT NULL,  -- 'mpesa', 'cash', 'bank'
    mpesa_receipt TEXT,  -- M-Pesa receipt number
    mpesa_transaction_id TEXT,  -- M-Pesa transaction ID
    
    -- Status
    status TEXT DEFAULT 'confirmed',  -- 'confirmed', 'pending', 'failed'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT applied_positive CHECK (applied_amount >= 0),
    CONSTRAINT mpesa_receipt_unique UNIQUE (business_id, mpesa_receipt)
);

-- Indexes
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_phone);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- LOCKED EVENT TYPES (Enforce 6 types only)
-- ============================================================================
ALTER TABLE commerce_events 
    DROP CONSTRAINT IF EXISTS event_type_locked;

ALTER TABLE commerce_events
    ADD CONSTRAINT event_type_locked CHECK (
        event_type IN (
            'whatsapp_message_in',
            'whatsapp_message_out',
            'mpesa_payment_callback',
            'manual_correction',
            'customer_proof',
            'merchant_note'
        )
    );

-- ============================================================================
-- UPDATE VIEWS (Reference explicit tables)
-- ============================================================================

-- Drop old views
DROP MATERIALIZED VIEW IF EXISTS orders_view;
DROP MATERIALIZED VIEW IF EXISTS payments_view;

-- Orders view (now just references orders table)
CREATE VIEW orders_view_simple AS
SELECT 
    business_id,
    id as order_id,
    customer_phone,
    customer_name,
    total_amount,
    outstanding_amount,
    is_credit,
    status,
    items,
    created_at,
    updated_at
FROM orders;

-- Payments view (references payments table)
CREATE VIEW payments_view_simple AS
SELECT
    business_id,
    id as payment_id,
    order_id,
    customer_phone,
    amount,
    applied_amount,
    method,
    mpesa_receipt,
    status,
    created_at
FROM payments;

-- Comments
COMMENT ON TABLE orders IS 'Explicit order records with outstanding_amount tracking';
COMMENT ON TABLE payments IS 'Explicit payment records with applied_amount tracking';
COMMENT ON CONSTRAINT event_type_locked ON commerce_events IS 'Enforces 6 locked event types (spec compliance)';
```

### **Task 3: Test Migration (30 min)**

```bash
cd repo-root/packages/database

# Run migration
npm run migrate

# Verify tables exist
supabase db diff

# Open Supabase Studio to inspect
npm run studio
```

**Test Queries:**
```sql
-- Test 1: Insert order, verify outstanding_amount defaults
INSERT INTO orders (business_id, customer_phone, total_amount) 
VALUES ('test-business', '254712345678', 1500.00);

SELECT id, total_amount, outstanding_amount FROM orders;
-- EXPECT: outstanding_amount = 1500.00

-- Test 2: Insert payment, reduce outstanding_amount
INSERT INTO payments (business_id, order_id, customer_phone, amount, applied_amount, method)
VALUES ('test-business', '[order-id-from-above]', '254712345678', 500.00, 500.00, 'mpesa');

-- Manual update (normally done by API)
UPDATE orders SET outstanding_amount = outstanding_amount - 500.00 
WHERE id = '[order-id]';

SELECT outstanding_amount FROM orders WHERE id = '[order-id]';
-- EXPECT: outstanding_amount = 1000.00

-- Test 3: Try to insert 7th event type (should fail)
INSERT INTO commerce_events (business_id, event_type, source_channel, payload)
VALUES ('test-business', 'invalid_type', 'test', '{}');
-- EXPECT: ERROR violates check constraint "event_type_locked"

-- Test 4: Insert duplicate M-Pesa receipt (should fail)
INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
VALUES ('test-business', '254712345678', 100, 100, 'mpesa', 'TEST123');

INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
VALUES ('test-business', '254712345678', 100, 100, 'mpesa', 'TEST123');
-- EXPECT: ERROR duplicate key value violates unique constraint
```

---

## ✅ CLEANUP COMPLETION CHECKLIST

### **Before Starting Day 1:**
- [ ] Root level cleaned (only archive/, humandocs/, repo-root/)
- [ ] Redundant frontend/ deleted
- [ ] Empty apps/ cleaned (only merchant/ remains)
- [ ] .gitignore created
- [ ] .env.example created
- [ ] Structure verified

### **Day 1 Foundation:**
- [ ] Supabase project created/linked
- [ ] Migration 0003 created
- [ ] Migration deployed successfully
- [ ] All 4 tests pass
- [ ] Schema visible in Supabase Studio
- [ ] BUILD-LOG.md updated

---

## 🎯 EXECUTION ORDER (Next 2 Hours)

### **NOW: Cleanup (15 minutes)**
```bash
# 1. Root cleanup
cd /Users/jaabirahmed/Documents/projects/WABAAA
rm -rf containerx elixosense-whatsapp docs

# 2. Kenya Commerce OS cleanup
cd kenya-commerce-os
rm -rf frontend apps/admin apps/customer

# 3. Verify
ls -la
ls -la apps/
```

### **THEN: Add Files (10 minutes)**
```bash
# Create .gitignore and .env.example
# (I'll provide these next)
```

### **THEN: Day 1 Migration (1.5 hours)**
```bash
# Set up Supabase
cd packages/database
npm install
supabase init
supabase link

# Create migration
# (Copy SQL from above)

# Deploy
npm run migrate

# Test
npm run studio
```

### **FINALLY: Update Log (5 minutes)**
```bash
# Update BUILD-LOG.md with Day 1 progress
```

---

**Ready to execute? Let's start with the cleanup! 🧹**
