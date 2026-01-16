# 📱 Merchant Onboarding Guide - Kenya Commerce OS

**Purpose**: Onboard 3-5 pilot merchants for Phase 2 validation  
**Timeline**: Week 2 (January 27-31, 2026)  
**Goal**: Each merchant processes 10+ orders successfully  

---

## Merchant Selection Criteria

### **Must Have**
- ✅ Mini-supermarket, grocery, or similar retail business
- ✅ 20+ orders per week currently
- ✅ WhatsApp as primary sales channel
- ✅ M-Pesa Till or Paybill active
- ✅ Willing to give weekly feedback
- ✅ Located in Nairobi or major town (for support)

### **Nice to Have**
- Existing customer base (50+ regular customers)
- Uses Excel/notebook for tracking (pain point we solve)
- Has debt/credit customers (tests our debt tracking)
- Morning rush orders (7am-9am) - tests bulk processing
- Tech-savvy owner (faster adoption)

### **Red Flags (Avoid)**
- ❌ Less than 10 orders/week (not enough volume)
- ❌ Cash-only business (no M-Pesa integration)
- ❌ No smartphone (can't use dashboard)
- ❌ Unwilling to try new tools
- ❌ Expects perfection (this is a pilot!)

---

## 30-Point Onboarding Checklist

### **Pre-Onboarding (Before Call)**

**Merchant Qualification**:
- [ ] 1. Verify business type (mini-supermarket/grocery)
- [ ] 2. Confirm 20+ orders/week
- [ ] 3. Verify WhatsApp Business number
- [ ] 4. Confirm M-Pesa Till/Paybill number
- [ ] 5. Get owner name and phone number

**System Preparation**:
- [ ] 6. Create business in database (`businesses` table)
- [ ] 7. Configure business type (`mini_supermarket`)
- [ ] 8. Set up WhatsApp number
- [ ] 9. Set up M-Pesa shortcode
- [ ] 10. Generate demo data (5 sample orders)

### **During Onboarding Call (30-45 minutes)**

**Introduction (5 min)**:
- [ ] 11. Explain what Kenya Commerce OS does
- [ ] 12. Set expectations (this is a pilot, bugs may happen)
- [ ] 13. Explain what we need from them (feedback, patience)
- [ ] 14. Confirm they're willing to proceed

**Product Setup (10 min)**:
- [ ] 15. Add 10-15 common products with prices
- [ ] 16. Set up product aliases (e.g., "sukari" = "sugar")
- [ ] 17. Configure units (kg, ltr, pcs)
- [ ] 18. Set up credit terms (if applicable)

**Test Order (10 min)**:
- [ ] 19. Merchant sends test WhatsApp message
- [ ] 20. Verify auto-reply received
- [ ] 21. Check order created in dashboard
- [ ] 22. Test M-Pesa payment link
- [ ] 23. Complete test payment (KSh 10)
- [ ] 24. Verify payment recorded

**Dashboard Training (10 min)**:
- [ ] 25. Show "Leo" screen (today's revenue)
- [ ] 26. Show "Deni" screen (customer debts)
- [ ] 27. Show "Bidhaa" screen (top products)
- [ ] 28. Explain daily SMS summary (18:00)
- [ ] 29. Show how to handle failed payments

**Next Steps (5 min)**:
- [ ] 30. Schedule Week 2 follow-up call
- [ ] 31. Give merchant your WhatsApp support number
- [ ] 32. Send onboarding summary via WhatsApp

---

## Onboarding Call Script

### **Opening (2 min)**

"Habari! My name is [Your Name]. Thank you for agreeing to try Kenya Commerce OS. This system will help you organize your WhatsApp orders and M-Pesa payments automatically.

This is a pilot program, so there may be some bugs. But I'll be available on WhatsApp every day to help you. Sound good?"

### **Expectations Setting (3 min)**

"Here's what the system does:
1. When a customer sends a WhatsApp order, it calculates the price automatically
2. It sends them an M-Pesa payment link
3. When they pay, it records the payment automatically
4. You get a daily SMS at 6pm with your revenue and debts
5. You can check your dashboard anytime to see who owes you money

What it does NOT do:
- It doesn't deliver products (you still do that)
- It doesn't chase customers for payment (but it sends reminders)
- It's not perfect yet (that's why we need your feedback)

Questions so far?"

### **Product Setup (10 min)**

"Let's add your products. Tell me your top 10 products and their prices.

For example:
- Sukari 2kg = KSh 200
- Unga 2kg = KSh 150
- Maziwa 1 ltr = KSh 60

[Add products to system while merchant talks]

Good! Now, do customers use different names for these products? For example, do they say 'sugar' instead of 'sukari'?

[Add aliases]

Perfect. Do you sell on credit? If yes, what are your terms? 7 days? 14 days?

[Configure credit terms]"

### **Test Order (10 min)**

"Now let's test it. Send me a WhatsApp message with an order. For example:

'Nataka sukari 2kg na unga 5kg'

[Wait for merchant to send message]

Great! Did you get an auto-reply with the price?

[Verify auto-reply]

Now click the M-Pesa link and pay KSh 10 (just for testing).

[Wait for payment]

Perfect! Now open this link: [Dashboard URL]

Do you see the order? Do you see the payment?

[Verify dashboard]"

### **Dashboard Training (10 min)**

"This is your dashboard. Let me show you the 4 screens:

**Leo (Today)**: This shows today's revenue, orders, and debts. Check this every morning.

**Deni (Debts)**: This shows who owes you money. Red = overdue, yellow = due soon, green = paid.

**Bidhaa (Products)**: This shows your top-selling products. Useful for knowing what to restock.

**Wateja (Customers)**: This shows your customer list and how much they've spent.

You'll also get a daily SMS at 6pm with a summary. No need to open the dashboard if you don't want to.

Questions?"

### **Troubleshooting (5 min)**

"What if something goes wrong?

**If WhatsApp doesn't reply**: Check if the customer spelled the product correctly. If not, send them the price manually and I'll fix the system.

**If M-Pesa payment doesn't record**: Click 'Record Payment' in the dashboard and enter the M-Pesa code manually. I'll investigate why it didn't work automatically.

**If you're confused**: WhatsApp me anytime. I'll respond within 2 hours during business hours.

Make sense?"

### **Closing (3 min)**

"Great! You're all set. Here's what happens next:

1. Start using the system for real orders today
2. I'll check in with you every day this week via WhatsApp
3. We'll have a feedback call on [Day/Time] next week
4. Tell me what works and what doesn't

Remember: This is a pilot. If something breaks, that's okay. Just let me know and I'll fix it.

Any final questions?

Asante sana! Let's make this work for you."

---

## Kenya-Specific Validation Questions

### **Week 2 Follow-Up Call Questions**

**WhatsApp Reliability**:
- "Has WhatsApp been down for you this week?"
- "Do customers prefer WhatsApp or SMS?"
- "Do customers send voice messages or text?"

**Order Patterns**:
- "What time do you get the most orders?"
- "How many orders do you get between 7am-9am?"
- "Can you keep up with the morning rush?"

**Debt Tracking**:
- "How do you currently track who owes you money?"
- "Do you use Excel? Paper notebook?"
- "How often do you forget who owes you?"
- "Do customers pay on time?"

**Agent/Reseller Model**:
- "Do you have agents who sell for you?"
- "How do you track their sales?"
- "How do you pay them commissions?"

**Payment Issues**:
- "Have any M-Pesa payments failed this week?"
- "Do customers pay immediately or later?"
- "Do you offer credit? How much?"

**System Usability**:
- "Is the dashboard easy to use?"
- "Do you check it daily?"
- "Do you trust the numbers?"
- "What's confusing or frustrating?"

**Feature Requests**:
- "What would make this system more useful?"
- "What takes too much time right now?"
- "What do you wish it could do?"

---

## Success Criteria Per Merchant

### **Week 1 (Onboarding Week)**
- ✅ Merchant completes onboarding call
- ✅ 10-15 products added to system
- ✅ Test order processed successfully
- ✅ Merchant can access dashboard
- ✅ Merchant understands how to use system

### **Week 2 (First Real Orders)**
- ✅ Merchant processes 5+ real orders
- ✅ 90%+ parsing accuracy (orders understood correctly)
- ✅ 95%+ M-Pesa success rate (payments recorded)
- ✅ Merchant checks dashboard 2+ times
- ✅ Merchant satisfied (7/10+)

### **Week 3 (SMS Fallback)**
- ✅ Merchant tests SMS fallback
- ✅ SMS delivery confirmed
- ✅ Merchant knows how to trigger SMS manually

### **Week 4 (Validation)**
- ✅ Merchant processes 20+ orders
- ✅ 95%+ parsing accuracy
- ✅ 98%+ M-Pesa success rate
- ✅ Merchant uses dashboard daily
- ✅ Merchant satisfaction 8/10+
- ✅ Merchant willing to continue

---

## Troubleshooting Guide

### **Issue: WhatsApp Auto-Reply Not Working**

**Symptoms**: Customer sends order, no reply received

**Diagnosis**:
1. Check Supabase logs for `whatsapp-webhook` errors
2. Check if webhook is configured correctly
3. Check if WhatsApp access token is valid
4. Check if customer phone number is correct format

**Fix**:
1. If webhook error: Fix and redeploy
2. If token expired: Refresh token in Meta Business Manager
3. If phone format wrong: Update `normalizePhone` function
4. Manual workaround: Merchant sends reply manually

### **Issue: M-Pesa Payment Not Recorded**

**Symptoms**: Customer pays, payment not showing in dashboard

**Diagnosis**:
1. Check Supabase logs for `mpesa-callback` errors
2. Check if M-Pesa callback URL is correct
3. Check if payment was actually successful (M-Pesa SMS)
4. Check if idempotency key caused duplicate rejection

**Fix**:
1. If callback error: Fix and redeploy
2. If URL wrong: Update in Daraja Portal
3. If payment failed: Customer needs to retry
4. Manual workaround: Use 'Record Payment' in dashboard

### **Issue: Parsing Accuracy Low**

**Symptoms**: System doesn't understand customer orders

**Diagnosis**:
1. Check what customer actually wrote
2. Check if product name is in system
3. Check if aliases are configured
4. Check if quantity/unit format is unusual

**Fix**:
1. Add missing product names
2. Add more aliases (e.g., "sugar" for "sukari")
3. Update parser rules for this business
4. Manual workaround: Merchant corrects order in dashboard

### **Issue: Dashboard Not Loading**

**Symptoms**: Merchant can't access dashboard

**Diagnosis**:
1. Check if URL is correct
2. Check if internet connection is working
3. Check if Supabase is down (status.supabase.com)
4. Check if browser is supported

**Fix**:
1. Send correct URL via WhatsApp
2. Ask merchant to try different network
3. Wait for Supabase to recover
4. Suggest Chrome/Firefox if using old browser

---

## Merchant Support Protocol

### **Response Times**
- **Critical** (system down, payments failing): 30 min
- **High** (orders not processing): 2 hours
- **Medium** (dashboard issues): 4 hours
- **Low** (feature requests): 24 hours

### **Support Channels**
- **Primary**: WhatsApp (fastest)
- **Secondary**: Phone call (if urgent)
- **Tertiary**: Email (for non-urgent)

### **Escalation**
- If issue not resolved in 4 hours → Phone call
- If issue not resolved in 24 hours → In-person visit
- If merchant threatens to quit → Immediate priority

---

## Post-Onboarding Checklist

### **Day 1 (After Onboarding)**
- [ ] Send WhatsApp: "How's it going? Any issues?"
- [ ] Check Sentry for errors
- [ ] Verify first real order processed

### **Day 3**
- [ ] Send WhatsApp: "Processed any orders? Questions?"
- [ ] Check merchant's order count
- [ ] Check parsing accuracy

### **Day 7 (End of Week 2)**
- [ ] Schedule feedback call
- [ ] Prepare questions
- [ ] Review merchant's metrics

---

## Merchant Communication Templates

### **Onboarding Confirmation (WhatsApp)**

```
Habari [Merchant Name]!

Asante for trying Kenya Commerce OS. Here's a summary:

✅ Your products are set up
✅ WhatsApp auto-reply is working
✅ M-Pesa payments will record automatically
✅ Daily SMS at 6pm with your revenue

Dashboard: [URL]

If anything breaks, WhatsApp me: [Your Number]

Let's make this work! 🚀
```

### **Daily Check-In (WhatsApp)**

```
Habari [Merchant Name]!

Quick check: How's the system working today?

Any issues? Any questions?

Reply "SAWA" if all good, or tell me what's wrong.
```

### **Weekly Feedback Request (WhatsApp)**

```
Habari [Merchant Name]!

Time for our weekly feedback call.

When are you free this week?
- Monday 2pm?
- Wednesday 10am?
- Friday 4pm?

30 minutes. I want to hear what's working and what's not.
```

---

## Success Stories to Share

### **Example: Kamau's Mini-Supermarket**

"Kamau used to spend 2 hours every evening counting orders and matching M-Pesa payments. Now he gets a daily SMS at 6pm with everything calculated. He checks his dashboard once a day and knows exactly who owes him money. He's processed 150+ orders in the first month with 98% accuracy."

### **Example: Grace's Grocery**

"Grace was losing track of credit customers. She'd forget who owed her money and felt bad asking. Now the system tracks everything and sends reminders automatically. Her outstanding debt dropped from KSh 50,000 to KSh 15,000 in 3 weeks."

---

## Next Steps After Onboarding

### **Week 2: Daily Monitoring**
- Check in with each merchant daily
- Fix bugs immediately
- Track metrics
- Build trust

### **Week 3: SMS Fallback**
- Test SMS with each merchant
- Verify delivery
- Train on manual trigger

### **Week 4: Feedback & Prioritization**
- Conduct feedback calls
- Document feature requests
- Prioritize for Weeks 5-6

---

**Last Updated**: January 17, 2026  
**Status**: Ready for Week 2 Onboarding  
**Next Review**: January 31, 2026 (after all merchants onboarded)
