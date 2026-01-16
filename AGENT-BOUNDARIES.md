# 🤖 AGENT BOUNDARIES: Kenya Commerce OS

**Purpose:** Define what each AI agent CAN and CANNOT do during the 14-day build.

**Why This Matters:** Without clear boundaries, agents will suggest features, redesign schemas, and cause scope creep. This document prevents drift and keeps the build on track.

---

## 🎯 CURSOR (Implementation Agent)

### ✅ **CURSOR CAN:**

1. **Write Code Within Spec**
   - Implement Supabase Edge Functions
   - Create React components
   - Write database queries
   - Implement IndexedDB sync logic
   - Add validation rules

2. **Write Tests**
   - Unit tests for functions
   - Integration tests for flows
   - Edge case tests
   - Performance tests

3. **Debug & Fix**
   - Fix failing tests
   - Debug runtime errors
   - Optimize performance (without changing behavior)
   - Refactor for clarity (without changing logic)

4. **Suggest Implementation Details**
   - "Use this Supabase RLS policy for isolation"
   - "Here's a better way to structure this query"
   - "This function could be split into two for clarity"

### ❌ **CURSOR CANNOT:**

1. **Change Core Schema**
   - Add new tables beyond the 4 core ones
   - Add new columns without approval
   - Remove existing columns
   - Rename tables or columns

2. **Add Event Types**
   - Only 6 event types allowed (see SPEC.md)
   - No new types without documented blocker + approval

3. **Redesign Data Flow**
   - Cannot change: orders → payments → events model
   - Cannot change: merchant corrections always win
   - Cannot change: idempotency logic

4. **Implement Unspecified Features**
   - No multi-user accounts (v1 = single owner only)
   - No inventory management beyond basic counts
   - No analytics beyond daily summary
   - No features not in SPEC.md

5. **Override Business Rules**
   - Cannot reject merchant corrections
   - Cannot skip idempotency checks
   - Cannot change Nairobi business hours
   - Cannot modify offline-first behavior

### 🔴 **IF CURSOR DOES THIS, STOP IT:**

```
❌ Cursor says: "Let's add a user preferences table"
   → STOP: Not in spec. Ask human first.

❌ Cursor says: "I'll add encryption for sensitive fields"
   → STOP: Over-engineering. Spec says immutable events are enough.

❌ Cursor adds: 7th event type
   → STOP: SPEC.md says 6 types only. Revert immediately.

❌ Cursor implements: Soft deletes (is_deleted flag)
   → STOP: Contradicts append-only principle. Revert.
```

### ✅ **CORRECT CURSOR INTERACTION:**

```
✅ Cursor asks: "Should I add a notes field to orders?"
   → RESPOND: Check SPEC.md. If not there, defer to v1.1.

✅ Cursor says: "I found a security issue: XSS vulnerability"
   → RESPOND: Fix immediately. Document in BUILD-LOG.md.

✅ Cursor asks: "How should I handle M-Pesa timeout?"
   → RESPOND: Retry with exponential backoff. Log to commerce_events.
```

---

## 🔍 PERPLEXITY (Research Agent)

### ✅ **PERPLEXITY CAN:**

1. **Validate APIs Are Current**
   - "Is WhatsApp Business API structure correct for Jan 2026?"
   - "Is M-Pesa STK Push format current?"
   - "Is Africastalking still the best SMS provider in Kenya?"

2. **Research Blockers**
   - "What's the current WhatsApp rate limit?"
   - "What M-Pesa callback format should I expect?"
   - "What are ODPC data protection requirements?"

3. **Report Evidence-Based Constraints**
   - "WhatsApp blocks images in automated messages"
   - "M-Pesa max transaction is 150K KES"
   - "ODPC registration takes 2-3 weeks"

4. **Find Documentation**
   - Links to current API docs
   - Policy pages
   - Compliance guides

### ❌ **PERPLEXITY CANNOT:**

1. **Suggest Spec Changes**
   - Cannot propose alternative architectures
   - Cannot recommend different event models
   - Cannot suggest new features

2. **Override Locked Decisions**
   - Spec says M-Pesa primary → Cannot suggest Stripe
   - Spec says 6 event types → Cannot suggest 7th
   - Spec says offline-first → Cannot suggest online-only

3. **Make Design Decisions**
   - Cannot choose between implementation options
   - Cannot prioritize features
   - Cannot decide what to build next

### 🔴 **IF PERPLEXITY DOES THIS, IGNORE IT:**

```
❌ Perplexity suggests: "Consider using Stripe instead of M-Pesa"
   → IGNORE: Spec is locked to M-Pesa. Not changing.

❌ Perplexity suggests: "Add user authentication with OAuth"
   → IGNORE: Not in v1 scope. Defer to v1.1.

❌ Perplexity says: "Event-sourcing is outdated, use CQRS"
   → IGNORE: Spec is locked. Not redesigning.
```

### ✅ **CORRECT PERPLEXITY INTERACTION:**

```
✅ Perplexity reports: "M-Pesa API changed callback format in Jan 2026"
   → RESPOND: Update implementation, document in BUILD-LOG.md.

✅ Perplexity reports: "WhatsApp now requires template pre-approval"
   → RESPOND: Add pre-approval step, update docs.

✅ Perplexity finds: "Africastalking cost is now 1.0 KES per SMS"
   → RESPOND: Update cost tracking, notify merchant.
```

---

## 🔄 N8N (Integration Automation Agent)

### ✅ **N8N CAN:**

1. **Orchestrate External APIs**
   - Connect WhatsApp webhook to database
   - Handle M-Pesa callbacks
   - Send SMS via Africastalking
   - Trigger daily summary at 19:30 EAT

2. **Implement Idempotency**
   - Check for duplicate message_id before processing
   - Verify TransactionID not already logged
   - Retry failed actions with backoff

3. **Maintain Audit Trail**
   - Log all webhooks to commerce_events
   - Record all outbound messages
   - Track all errors

4. **Handle Errors Gracefully**
   - Retry failed webhooks (exponential backoff)
   - Fallback to SMS if WhatsApp fails
   - Log errors, notify merchant

### ❌ **N8N CANNOT:**

1. **Modify Core Tables Directly**
   - Must use Supabase Edge Functions (API layer)
   - No direct SQL updates to orders/payments
   - Cannot bypass idempotency checks

2. **Change Payment Logic**
   - Cannot decide how to apply payments
   - Cannot override outstanding_amount calculation
   - Cannot reject partial payments

3. **Override Merchant Corrections**
   - Cannot "validate" merchant corrections
   - Cannot reject manual corrections
   - Cannot flag corrections as "suspicious"

4. **Make Policy Decisions**
   - Cannot decide when to send SMS vs WhatsApp
   - Cannot change business hours
   - Cannot modify rate limits

### 🔴 **IF N8N DOES THIS, RECONFIGURE IT:**

```
❌ n8n workflow: Direct UPDATE to orders table
   → STOP: Must call record_payment API instead.

❌ n8n workflow: Skips idempotency check "for speed"
   → STOP: Idempotency is mandatory. Fix immediately.

❌ n8n workflow: Sends SMS at 2 AM
   → STOP: Business hours are 07:00-20:00. Reconfigure.
```

### ✅ **CORRECT N8N INTERACTION:**

```
✅ n8n workflow: WhatsApp webhook → Check message_id → Call API
   → CORRECT: Idempotent, logged, API-driven.

✅ n8n workflow: M-Pesa callback → Verify signature → Call API
   → CORRECT: Secure, idempotent, logged.

✅ n8n workflow: WhatsApp fails → Fallback to SMS
   → CORRECT: Graceful degradation, merchant still notified.
```

---

## 👤 YOU (Human - Architect & Validator)

### ✅ **ONLY YOU CAN:**

1. **Approve Spec Changes**
   - Review blocker evidence
   - Decide if change is justified
   - Update SPEC.md with version bump
   - Document rationale

2. **Resolve Ambiguities**
   - Agent asks: "Should this be in v1 or v1.1?"
   - You decide based on merchant needs
   - Document decision in BUILD-LOG.md

3. **Validate Merchant UX**
   - Test on mobile device
   - Check Swahili labels are natural
   - Verify offline behavior makes sense
   - Ensure flow is simple for low-literacy users

4. **Make Go/No-Go Decisions**
   - Day 4: WhatsApp integration working?
   - Day 7: Full flow end-to-end?
   - Day 14: Ready for production?

5. **Review Legal/Compliance**
   - Data Processing Agreement correct?
   - Privacy Policy PDPA-compliant?
   - Tax disclaimer clear?
   - SIM swap warning displayed?

### 📋 **YOUR DAILY CHECKLIST:**

```yaml
MORNING (30 min):
  - [ ] Review yesterday's BUILD-LOG.md
  - [ ] Check for blockers
  - [ ] Plan today's tasks
  - [ ] Brief agents (paste SPEC boundary)

DURING BUILD (ongoing):
  - [ ] Monitor agent outputs (are they within bounds?)
  - [ ] Answer clarifying questions
  - [ ] Validate tests pass
  - [ ] Check mobile behavior

END OF DAY (30 min):
  - [ ] Review all code changes
  - [ ] Validate against SPEC.md
  - [ ] Update BUILD-LOG.md
  - [ ] Commit code to git
  - [ ] Identify tomorrow's focus
```

---

## 🚨 DRIFT DETECTION & RECOVERY

### **How to Detect Spec Drift**

```bash
# Daily spec compliance check
git diff SPEC.md  # Should be empty (no changes)

# Check for unauthorized event types
grep -r "event_type.*=" packages/  # Should only find 6 types

# Check for new tables
supabase db diff  # Should only show 4 core tables

# Check for skipped idempotency
grep -r "ON CONFLICT" packages/  # Should find DO NOTHING
```

### **Recovery Procedure**

```bash
# If agent violated spec:

# 1. Identify violation
git log --oneline  # Which commit?

# 2. Revert code
git revert [commit-hash]

# 3. Re-brief agent
# Paste SPECIFICATION BOUNDARY prompt again

# 4. Document in BUILD-LOG.md
echo "## Spec Violation" >> BUILD-LOG.md
echo "Agent added 7th event type. Reverted." >> BUILD-LOG.md

# 5. Prevent recurrence
# Update AGENT-BOUNDARIES.md with specific example
```

---

## 📊 AGENT WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────┐
│  YOU: Daily Planning & Validation       │
├─────────────────────────────────────────┤
│ Morning: Brief agents, set boundaries   │
│ During:  Monitor, validate, answer Qs   │
│ Evening: Review, update BUILD-LOG.md    │
└──────────┬──────────────────────────────┘
           │
           ├──> CURSOR: Implementation
           │    ├─ Write code within spec
           │    ├─ Write tests
           │    ├─ Debug errors
           │    └─ Ask if unclear
           │
           ├──> PERPLEXITY: Research
           │    ├─ Validate APIs current
           │    ├─ Research blockers
           │    ├─ Find documentation
           │    └─ Report evidence
           │
           └──> N8N: Automation
                ├─ Orchestrate webhooks
                ├─ Implement idempotency
                ├─ Handle errors
                └─ Maintain audit trail
           
           ↓
    ┌──────────────────┐
    │  SPEC.md         │  ← IMMUTABLE
    │  (Frozen Spec)   │  ← NO CHANGES
    └──────────────────┘
```

---

## ✅ DECISION TREE: WHEN TO STOP AGENTS

```
Agent proposes something
    ↓
Is it in SPEC.md?
    ├─ YES → Proceed
    └─ NO → Is it critical for v1?
           ├─ YES → Ask human (you decide)
           └─ NO → Defer to v1.1, blocked

Agent encounters blocker
    ↓
Can it be worked around within spec?
    ├─ YES → Work around, document
    └─ NO → Escalate to human
           ├─ If spec change needed → Review evidence
           └─ If spec okay → Find alternative

Agent suggests optimization
    ↓
Does it change behavior?
    ├─ NO → Proceed (performance only)
    └─ YES → Does it improve spec compliance?
           ├─ YES → Proceed
           └─ NO → Blocked (keep current behavior)
```

---

## 🎯 FINAL RULES (Summary)

### **For Cursor:**
- ✅ Write code, tests, debug
- ❌ Change schema, add features, redesign

### **For Perplexity:**
- ✅ Research, validate, document
- ❌ Suggest changes, override decisions

### **For n8n:**
- ✅ Automate, log, retry
- ❌ Direct DB updates, skip checks

### **For You:**
- ✅ Approve, validate, decide
- ❌ Let agents drift unchecked

---

**Build within boundaries. Ship on time. Launch with confidence. 🚀**

**Last Updated:** January 16, 2026
