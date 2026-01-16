# 🎯 NEXT STEPS: Kenya Commerce OS

**Current Status:** ✅ Cleanup Complete | ✅ Day 1 Preparation Complete  
**Next Action:** Set Up Supabase & Deploy Migration  
**Time Required:** 30-60 minutes

---

## 📊 WHAT'S DONE

### ✅ **Cleanup & Organization (100%)**
- Removed redundant code (containerx, elixosense-whatsapp, docs)
- Consolidated structure (single merchant app)
- Created foundation files (.gitignore, .env.example)
- Clean, organized codebase ready for development

### ✅ **Day 1 Preparation (100%)**
- Created migration 0003 (explicit orders/payments tables)
- Added SPEC-compliant constraints (6 locked event types)
- Implemented RLS policies (multi-tenant isolation)
- Added helper functions (apply_payment_to_order)
- Documented everything (BUILD-LOG.md, CLEANUP-COMPLETE.md)

### 🔜 **What Remains (Day 1 Execution)**
- Set up Supabase project
- Deploy migrations
- Verify schema
- Run tests

---

## 🚀 YOUR IMMEDIATE NEXT STEPS

### **Step 1: Set Up Supabase (15 minutes)**

#### **Option A: Create New Project**
```bash
# 1. Go to https://supabase.com
# 2. Sign in (or create account)
# 3. Click "New Project"
# 4. Fill in:
#    - Name: kenya-commerce-os
#    - Database Password: [generate strong password]
#    - Region: us-east-1 (or closest to Kenya)
# 5. Wait for project to be created (~2 minutes)
```

#### **Option B: Use Existing Project**
```bash
# If you already have a Supabase project:
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Get credentials (Step 2 below)
```

---

### **Step 2: Get Credentials (5 minutes)**

```bash
# In Supabase Dashboard:

# 1. Project URL
#    Settings → API → Project URL
#    Example: https://abc123.supabase.co

# 2. Anon Key
#    Settings → API → Project API keys → anon public
#    Example: eyJhbGciOiJIUzI1NiIsInR5cCI6...

# 3. Service Role Key
#    Settings → API → Project API keys → service_role
#    ⚠️ NEVER expose this publicly!

# 4. Database URL
#    Settings → Database → Connection string → URI
#    Example: postgresql://postgres:[password]@db.abc123.supabase.co:5432/postgres
```

---

### **Step 3: Create .env.local (2 minutes)**

```bash
cd /Users/jaabirahmed/Documents/projects/WABAAA/kenya-commerce-os

# Copy example
cp .env.example .env.local

# Edit .env.local (use your favorite editor)
# Fill in the 4 Supabase values from Step 2:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_KEY
# - DATABASE_URL
```

**Example .env.local:**
```bash
# SUPABASE
SUPABASE_URL=https://youractualproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:yourpassword@db.yourproject.supabase.co:5432/postgres

# Rest can stay as placeholders for now
WHATSAPP_PHONE_NUMBER_ID=placeholder
# ... etc
```

---

### **Step 4: Install Dependencies (2 minutes)**

```bash
cd packages/database

# Install Supabase CLI and dependencies
npm install

# Verify installation
npx supabase --version
# Should see: supabase version x.xx.x
```

---

### **Step 5: Link to Supabase Project (2 minutes)**

```bash
# Still in packages/database/

# Initialize Supabase
npx supabase init

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Your project ref is in the URL:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF
# Example: if URL is https://supabase.com/dashboard/project/abc123xyz
# Then project-ref is: abc123xyz
```

---

### **Step 6: Deploy Migrations (5 minutes)**

```bash
# Run all migrations
npm run migrate

# You should see:
# ✅ Migration 0001_create_commerce_events.sql applied
# ✅ Migration 0002_create_businesses.sql applied
# ✅ Migration 0003_create_explicit_orders_payments.sql applied
# ✅ Migration 0004_create_auth_tables.sql applied
```

**If errors occur:**
```bash
# Check what's wrong
npx supabase db diff

# Reset and retry (destructive!)
npx supabase db reset
npm run migrate
```

---

### **Step 7: Verify Schema (5 minutes)**

```bash
# Open Supabase Studio (web interface)
npm run studio

# Or manually visit:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor
```

**What to verify:**
1. **Tables exist**:
   - ✅ businesses
   - ✅ orders (with outstanding_amount column)
   - ✅ payments (with applied_amount column)
   - ✅ commerce_events

2. **Constraints exist**:
   - ✅ orders: CHECK (outstanding_amount >= 0)
   - ✅ payments: UNIQUE (business_id, mpesa_receipt)
   - ✅ commerce_events: CHECK (event_type IN (...6 types...))

3. **RLS enabled**:
   - ✅ orders: Row Level Security ON
   - ✅ payments: Row Level Security ON

---

### **Step 8: Run Tests (10 minutes)**

**In Supabase Studio SQL Editor:**

#### **Test 1: Verify outstanding_amount defaults**
```sql
-- Insert test order
INSERT INTO orders (business_id, customer_phone, total_amount) 
VALUES ('test', '254712345678', 1500.00);

-- Check result
SELECT id, total_amount, outstanding_amount 
FROM orders 
WHERE business_id = 'test';

-- EXPECT: outstanding_amount = 1500.00 ✅
```

#### **Test 2: Verify payment application**
```sql
-- Apply payment
SELECT * FROM apply_payment_to_order(
    '[order-id-from-test-1]'::uuid, 
    500.00
);

-- Check result
SELECT outstanding_amount, status 
FROM orders 
WHERE id = '[order-id-from-test-1]';

-- EXPECT: outstanding_amount = 1000.00, status = 'partial' ✅
```

#### **Test 3: Verify 7th event type is rejected**
```sql
-- Try to insert invalid event type
INSERT INTO commerce_events (business_id, event_type, source_channel, payload)
VALUES ('test', 'invalid_type', 'test', '{}');

-- EXPECT: ERROR - violates check constraint "event_type_locked" ✅
```

#### **Test 4: Verify duplicate M-Pesa receipt rejected**
```sql
-- Insert first payment
INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
VALUES ('test', '254712345678', 100, 100, 'mpesa', 'TEST123');

-- Try duplicate
INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
VALUES ('test', '254712345678', 100, 100, 'mpesa', 'TEST123');

-- EXPECT: ERROR - duplicate key value violates unique constraint ✅
```

#### **Cleanup Test Data**
```sql
-- Remove test data
DELETE FROM payments WHERE business_id = 'test';
DELETE FROM orders WHERE business_id = 'test';
DELETE FROM commerce_events WHERE business_id = 'test';
```

---

### **Step 9: Update BUILD-LOG.md (5 minutes)**

```bash
# Update BUILD-LOG.md with:
- ✅ Supabase project created/linked
- ✅ Migrations deployed successfully
- ✅ All 4 tests passed
- ✅ Schema verified in Studio
- Any issues encountered and resolutions
```

---

## ✅ DAY 1 COMPLETION CHECKLIST

### **Before Marking Day 1 Complete:**
- [ ] Supabase project created or linked
- [ ] Dependencies installed (`npm install` in packages/database/)
- [ ] Migrations deployed (`npm run migrate`)
- [ ] 4 core tables visible in Supabase Studio
- [ ] Test 1 passed (outstanding_amount defaults correctly)
- [ ] Test 2 passed (payment application works)
- [ ] Test 3 passed (7th event type rejected)
- [ ] Test 4 passed (duplicate M-Pesa receipt rejected)
- [ ] BUILD-LOG.md updated with results
- [ ] .env.local created (credentials filled)

---

## 🎯 AFTER DAY 1 IS COMPLETE

### **Immediate Next: Day 2 (API Layer)**

```bash
# Day 2 Task: Create 4 Supabase Edge Functions
1. create_order (POST)
2. record_payment (POST)
3. correct_order (POST)
4. get_order_summary (GET)

# See INTEGRATION-PLAN.md → Day 2 section
```

### **Quick Commands Reference**

```bash
# Navigate to project
cd /Users/jaabirahmed/Documents/projects/WABAAA/kenya-commerce-os

# Database operations
cd packages/database
npm run migrate          # Run migrations
npm run studio           # Open Supabase Studio
npm run types            # Generate TypeScript types

# Merchant app (future)
cd apps/merchant
npm run dev              # Start dev server

# Check everything
cat .env.local | grep SUPABASE  # Verify credentials
```

---

## 🚨 TROUBLESHOOTING

### **"Cannot find module 'supabase'"**
```bash
cd packages/database
npm install
```

### **"No project linked"**
```bash
npx supabase link --project-ref YOUR_REF
```

### **"Migration failed"**
```bash
# Check error details
npx supabase db diff

# View migration history
npx supabase migration list

# Reset and retry (DESTRUCTIVE!)
npx supabase db reset
npm run migrate
```

### **"RLS blocks my queries"**
```sql
-- Temporarily disable for testing
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

---

## 📚 REFERENCE DOCUMENTS

| Document | Purpose |
|----------|---------|
| `START-HERE.md` | Main command center |
| `SPEC.md` | Frozen specification |
| `INTEGRATION-PLAN.md` | 14-day timeline |
| `CLEANUP-COMPLETE.md` | What we just did |
| `NEXT-STEPS.md` | This file (immediate actions) |
| `BUILD-LOG.md` | Daily progress tracker |

---

## 🎊 YOU'RE ALMOST THERE!

**Current State:**
- ✅ Codebase clean and organized
- ✅ Migration ready to deploy
- ✅ Documentation complete

**Next State (60 minutes away):**
- ✅ Supabase project live
- ✅ Schema deployed
- ✅ Tests passed
- ✅ Day 1 complete
- 🎯 Ready for Day 2 (API Layer)

---

**First Command to Run:**
```bash
cd /Users/jaabirahmed/Documents/projects/WABAAA/kenya-commerce-os/packages/database
npm install
```

**Then follow Steps 1-9 above.** 🚀

---

**Last Updated:** January 16, 2026  
**Estimated Time to Complete:** 30-60 minutes  
**Difficulty:** Easy (just follow the steps)
