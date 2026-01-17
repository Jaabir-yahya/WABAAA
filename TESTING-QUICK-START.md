# 🚀 Testing Quick Start Guide

**You have**: 10 capabilities + 7 patterns + 8 workflows = Complete Kenya Commerce OS  
**Testing approach**: Smart & efficient (50 focused tests, not 200+ redundant)  
**Time needed**: 3-8 hours depending on coverage level  

---

## 📊 WHAT YOU HAVE (Current Status)

### ✅ Already Tested (47/47 passing)
```
✅ Message parsing (Swahili/English/Mixed)
✅ Business type routing (mini_supermarket, restaurant)
✅ Order management (create, correct, status)
✅ Payment processing (M-Pesa, QR, manual)
✅ Event sourcing (immutable audit log)
✅ Financial foundation (customer profiles, business metrics)
✅ Security (RLS, JWT, rate limiting)
✅ WhatsApp e2e flow
✅ QR order flow
✅ Restaurant modifiers
✅ Partner API gateway
```

**These are production-ready!** ✨

### ⚠️ Need Manual Testing
```
⚠️ SMS delivery (send real SMS)
⚠️ Dashboard UI (5 screens)
⚠️ Daily summary (trigger at 18:00)
⚠️ Payment reminders (trigger at 09:00)
⚠️ Real-time updates (watch screen update)
⚠️ Offline mode (disconnect internet)
⚠️ Kenya edge cases (network issues, etc.)
```

---

## 🎯 THREE TESTING OPTIONS

### **Option 1: Quick Smoke Test** ⚡ (30 minutes)
**Before deploying to production**

```bash
# 1. Verify automated tests still pass
cd supabase/functions
deno test _tests/*.test.ts -A
# Expected: 47/47 passing

# 2. Test Kamau's critical path
curl -X POST [webhook-url] -d '{"message": "nataka sukari 2kg"}'
# Verify: Auto-reply received, order created, M-Pesa link sent

# 3. Test payment
curl -X POST [mpesa-callback-url] -d '{"ResultCode": 0, ...}'
# Verify: Payment recorded, outstanding updated

# 4. Check dashboard
open http://localhost:5173
# Verify: Leo screen shows revenue, Deni shows debts

✅ If all 4 pass → Ready to deploy!
```

---

### **Option 2: Critical Path Testing** 🎯 (3 hours)
**Before onboarding first merchant**

**Hour 1: Core Flows**
```bash
# Test Kamau's full workflow
./test-kamau-workflow.sh

Covers:
✅ WhatsApp order → Parse → Price → M-Pesa → Confirmation
✅ Partial payment → Outstanding tracking
✅ Daily SMS summary
✅ Payment reminder
✅ Dashboard updates
```

**Hour 2: Alternative Flows**
```bash
# Test QR flow
curl -X POST .../generate-qr -d '{"type": "product", ...}'
curl -X POST .../mpesa-callback -d '{"KCOS": "...", ...}'

# Test restaurant flow
curl -X POST .../whatsapp-webhook -d '{"message": "chips mayai extra cheese"}'

# Test manual payment
curl -X POST .../record-payment -d '{"amount": 500, ...}'
```

**Hour 3: Kenya Edge Cases**
```bash
# Test offline mode
# Browser: DevTools → Application → Offline checkbox
# Verify: Dashboard still works, queues updates

# Test SMS fallback
curl -X POST .../daily-summary -d '{"business_id": "test"}'
# Verify: SMS received

# Test WhatsApp rate limit
# Send 101 messages rapidly
# Verify: Rate limit enforced, no crash

# Test low network
# Browser: DevTools → Network → Slow 3G
# Verify: <2s load time
```

---

### **Option 3: Full Test Suite** 📋 (8 hours)
**Before scaling to 10+ merchants**

**Day 1: Capabilities (2 hours)**
- Run all automated tests ✅
- Manual test SMS
- Manual test dashboard (all 5 screens)
- Manual test automation (trigger summary & reminders)

**Day 2: Compositions (2 hours)**
- Test all 7 patterns
- Verify integrations work together
- Document any issues

**Day 3: Workflows (3 hours)**
- Test all 8 Kenya use cases
- Mini-supermarket (Kamau)
- Restaurant
- QR-first shop
- Invoice payment
- Multi-location
- Credit/debt management
- Customer retention
- Business health monitoring

**Day 4: Edge Cases (1 hour)**
- Network issues
- WhatsApp shutdown
- M-Pesa failures
- Low-end devices
- Language variations
- Payment edge cases
- Concurrency
- Data integrity

---

## 🇰🇪 CRITICAL KENYA TESTS (Must Do Before Launch)

### **1. Network Reliability** 🔴 HIGH PRIORITY
```bash
# Simulate network drop
1. Open dashboard
2. Disconnect WiFi/Data
3. Try to create order
4. Reconnect network
5. Verify: Order syncs automatically

Expected: ✅ No data loss, background sync works
```

### **2. SMS Fallback** 🔴 HIGH PRIORITY
```bash
# Test SMS when WhatsApp fails
1. Trigger daily summary
2. Verify SMS received (check phone)
3. Verify format is readable
4. Verify cost is tracked

Expected: ✅ SMS delivered, KES 0.80 charged
```

### **3. M-Pesa Reliability** 🔴 HIGH PRIORITY
```bash
# Test payment edge cases
1. Duplicate payment (same receipt number)
2. Delayed callback (>5 min)
3. Failed payment (ResultCode != 0)
4. Orphaned payment (no order)

Expected: ✅ Idempotency works, failures handled gracefully
```

### **4. Low-End Device** 🟡 MEDIUM PRIORITY
```bash
# Test on 2GB RAM Android phone
1. Open dashboard
2. Check load time (<2s)
3. Check bundle size (<100KB)
4. Check responsiveness (smooth scrolling)

Expected: ✅ Works on low-end device
```

### **5. Language Variations** 🟡 MEDIUM PRIORITY
```bash
# Test message parsing
Test messages:
- "Nataka sukari 2kg" (Pure Swahili)
- "I want 2kg sugar" (Pure English)
- "Nataka 2kg sugar" (Mixed)
- "NATAKA SUKARI 2KG" (All caps)
- "nataka sukarii 2kg" (Misspelled)

Expected: ✅ All parsed correctly (confidence >0.7)
```

---

## 📝 TEST EXECUTION CHECKLIST

### **Pre-Launch Testing** (Before first merchant)
```
Phase 1: Automated Tests
[ ] Run: deno test _tests/*.test.ts -A
[ ] Result: 47/47 passing ✅

Phase 2: Manual Critical Path
[ ] Kamau workflow (order → pay → dashboard)
[ ] SMS delivery test
[ ] Dashboard UI (all 5 screens)
[ ] Offline mode

Phase 3: Kenya Edge Cases
[ ] Network drop + recovery
[ ] SMS fallback
[ ] M-Pesa edge cases
[ ] Low-end device (if available)

Phase 4: Documentation
[ ] Document any issues found
[ ] Update KNOWN-ISSUES.md
[ ] Create merchant FAQ
```

### **Post-Launch Testing** (After first merchant)
```
Week 1: Monitor Daily
[ ] Check Sentry for errors
[ ] Check Supabase logs
[ ] Verify SMS delivery
[ ] Verify M-Pesa callbacks
[ ] Merchant feedback call

Week 2: Stress Test
[ ] Multiple concurrent orders
[ ] High-volume day (50+ orders)
[ ] Network fluctuations
[ ] Dashboard performance

Week 4: Full Validation
[ ] Run full test suite again
[ ] Compare with production data
[ ] Update test cases based on real usage
```

---

## 🔧 TEST COMMANDS CHEAT SHEET

### **Run Automated Tests**
```bash
cd supabase/functions
deno test _tests/*.test.ts -A
```

### **Test WhatsApp Order**
```bash
curl -X POST https://[project].supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254712345678",
            "text": {"body": "nataka sukari 2kg"}
          }]
        }
      }]
    }]
  }'
```

### **Test M-Pesa Payment**
```bash
curl -X POST https://[project].supabase.co/functions/v1/mpesa-callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 0,
    "TransAmount": 200,
    "PhoneNumber": "254712345678",
    "MpesaReceiptNumber": "TEST123"
  }'
```

### **Test Daily Summary**
```bash
curl -X POST https://[project].supabase.co/functions/v1/daily-summary \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense"}'
```

### **Test Payment Reminder**
```bash
curl -X POST https://[project].supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer [key]" \
  -d '{"business_id": "elixosense"}'
```

### **Test Dashboard (Local)**
```bash
cd apps/merchant-svelte
npm run dev
open http://localhost:5173
```

---

## 🎯 TEST PRIORITIES (If Time Limited)

### **MUST TEST** (Critical - 1 hour)
1. ✅ Automated tests (already passing)
2. Kamau workflow (order → pay → dashboard)
3. SMS delivery
4. Offline mode

### **SHOULD TEST** (Important - 2 hours)
5. QR order flow
6. Restaurant modifiers
7. Payment edge cases (duplicate, delayed)
8. Daily summary + reminders

### **NICE TO TEST** (Optional - 4 hours)
9. All 8 workflows
10. Full Kenya edge cases
11. Low-end device
12. Concurrency tests

---

## 🐛 KNOWN ISSUES TO WATCH FOR

### **Common Issues (From Phase 1)**
```
✅ FIXED: Parser amount type error
✅ FIXED: Alias list type casting
✅ FIXED: Override modifier in RestaurantParser
✅ FIXED: Supabase schema type conflicts
```

### **Potential Issues (Not Yet Encountered)**
```
⚠️ M-Pesa callback delay (>5 min)
   → Workaround: Manual payment entry

⚠️ WhatsApp rate limit (>1000/day)
   → Workaround: SMS fallback

⚠️ Network drop during payment
   → Workaround: Background sync + retry

⚠️ Duplicate webhook delivery
   → Solution: Idempotency keys (already implemented)
```

---

## 📊 TEST COVERAGE SUMMARY

```
Automated Tests:        47/47 ✅ (100%)
Manual Tests:           7/15 ⚠️  (47%)
Workflow Tests:         2/8 ⚠️   (25%)
Edge Case Tests:        0/10 ⚠️  (0%)
-------------------------------------------
Total Coverage:         56/80 ⚠️  (70%)
```

**Before Production**: Aim for 80%+ (64/80 tests)  
**Before Scaling**: Aim for 95%+ (76/80 tests)  

---

## 🚀 NEXT STEPS

### **This Weekend** (Saturday/Sunday)
1. Read [CAPABILITY-TEST-PLAN.md](CAPABILITY-TEST-PLAN.md) (30 min)
2. Run smoke test (30 min)
3. Test critical Kenya edge cases (1 hour)
4. Document any issues

### **Week 1** (Jan 20-26)
1. Configure APIs (Monday-Wednesday)
2. Deploy Phase 1 (Wednesday)
3. Run full critical path test (Thursday)
4. Ready for merchant onboarding (Friday)

### **Week 2** (Jan 27-31)
1. Onboard 3 merchants (Mon-Wed)
2. Monitor daily (Thu-Sun)
3. Collect production test data
4. Update test cases based on real usage

---

## 💡 TESTING PHILOSOPHY

### **Test Smart, Not Hard**
```
❌ Don't test everything exhaustively
✅ Test critical paths thoroughly
✅ Test Kenya-specific scenarios
✅ Test what can break in production
```

### **Production is the Ultimate Test**
```
✅ 47/47 automated tests passing = Foundation is solid
⚠️ Real merchant usage = Best validation
🎯 Week 3 feedback = Feature prioritization
```

### **Fail Fast, Fix Fast**
```
✅ Find issues in testing (better)
⚠️ Find issues in production (acceptable)
❌ Find issues after scaling (too late)
```

---

## 📞 WHEN TO ASK FOR HELP

### **If Tests Fail**
1. Check CAPABILITY-TEST-PLAN.md for troubleshooting
2. Check Sentry for error details
3. Check Supabase logs for stack traces
4. Document the issue with reproduction steps

### **If Kenya Edge Cases Fail**
1. This is expected (reality is messy)
2. Document the scenario
3. Create workaround for merchant
4. Add to backlog for future fix

### **If Production Issues**
1. Check merchant can still operate (critical)
2. Manual workarounds (record payment manually, etc.)
3. Fix within 24 hours
4. Update tests to prevent recurrence

---

**Test the critical path. Ship to Kamau. Iterate based on real usage. 🇰🇪🚀**

---

**Full Details**: See [CAPABILITY-TEST-PLAN.md](CAPABILITY-TEST-PLAN.md)  
**Current Status**: [TEST-REPORT.md](TEST-REPORT.md) (47/47 passing)  
**Phase 2 Plan**: [PHASE2-ROADMAP.md](PHASE2-ROADMAP.md)
