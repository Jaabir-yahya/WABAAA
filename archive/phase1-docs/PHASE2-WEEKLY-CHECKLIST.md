# ✅ Phase 2 Weekly Checklist - Hybrid Approach

**Strategy**: Validate → Build Top 3 → Iterate  
**Duration**: 8 Weeks (Jan 20 - Mar 17, 2026)  
**Goal**: 5 merchants, 3 features, 90%+ retention  

---

## 📅 WEEK 1: Deploy & Configure (Jan 20-26)

### **Monday (Jan 20): API Setup**
- [ ] Create Meta WhatsApp Business Account
- [ ] Get WhatsApp access token + phone number ID
- [ ] Create M-Pesa Daraja account (production)
- [ ] Get M-Pesa consumer key, secret, passkey
- [ ] Create Africa's Talking account
- [ ] Get SMS API key
- [ ] Generate encryption key (`openssl rand -hex 32`)
- [ ] Set all environment variables in Supabase
- [ ] Test each API individually

### **Tuesday (Jan 21): Webhook Configuration**
- [ ] Configure WhatsApp webhook in Meta Business Manager
- [ ] Configure M-Pesa callback in Daraja Portal
- [ ] Test WhatsApp webhook (send test message)
- [ ] Test M-Pesa callback (sandbox transaction)
- [ ] Test SMS delivery (Africa's Talking)
- [ ] Verify all webhooks in Supabase logs
- [ ] Check Sentry for errors

### **Wednesday (Jan 22): Production Deployment**
- [ ] Verify all 15 Edge Functions deployed
- [ ] Verify all 7 migrations applied
- [ ] Set up Sentry error monitoring
- [ ] Configure pg_cron (daily summary, reminders)
- [ ] Test end-to-end flow (order → payment → confirmation)
- [ ] Create production business (elixosense)
- [ ] Smoke test all features

### **Thursday (Jan 23): Merchant Selection**
- [ ] Contact 10 potential merchants (WhatsApp/phone)
- [ ] Explain Kenya Commerce OS (30 sec pitch)
- [ ] Assess fit (mini-supermarket, 20+ orders/week)
- [ ] Select 3 best-fit merchants
- [ ] Schedule onboarding calls (Friday-Sunday)
- [ ] Send onboarding confirmation

### **Friday (Jan 24): Demo Data Prep**
- [ ] Create 3 business records in database
- [ ] Generate demo products for each
- [ ] Test onboarding flow with demo
- [ ] Prepare onboarding call script
- [ ] Set up monitoring alerts
- [ ] Plan Week 2 schedule

**📊 Week 1 Success Criteria**:
- ✅ All APIs configured and tested
- ✅ All webhooks verified
- ✅ 3 merchants selected and scheduled

---

## 📅 WEEK 2: Onboard & Monitor (Jan 27 - Feb 2)

### **Monday (Jan 27): Merchant A Onboarding**
- [ ] Onboarding call (45 min)
- [ ] Add 10-15 products to system
- [ ] Test order flow (merchant sends test message)
- [ ] Verify auto-reply received
- [ ] Test M-Pesa payment
- [ ] Train on dashboard usage
- [ ] Set up daily check-in schedule

### **Tuesday (Jan 28): Merchant B Onboarding**
- [ ] Onboarding call (45 min)
- [ ] Add products
- [ ] Test order flow
- [ ] Train on dashboard
- [ ] Schedule follow-ups

### **Wednesday (Jan 29): Merchant C Onboarding**
- [ ] Onboarding call (45 min)
- [ ] Add products
- [ ] Test order flow
- [ ] Train on dashboard
- [ ] Schedule follow-ups

### **Thursday-Sunday (Jan 30 - Feb 2): Daily Monitoring**
- [ ] Check Sentry for errors (daily)
- [ ] Check Supabase logs (daily)
- [ ] WhatsApp check-in with each merchant
- [ ] Track 10 key metrics:
  - Orders processed
  - Parsing accuracy
  - M-Pesa success rate
  - WhatsApp delivery rate
  - Dashboard usage
  - Merchant satisfaction
  - Customer complaints
  - Failed payments
  - QR code scans
  - Daily summary delivery
- [ ] Respond to merchant questions (<2 hrs)
- [ ] Fix critical bugs immediately

**📊 Week 2 Success Criteria**:
- ✅ 3 merchants onboarded and trained
- ✅ Each processes 5+ orders
- ✅ 90%+ parsing accuracy
- ✅ 95%+ M-Pesa success rate
- ✅ Daily monitoring routine established

---

## 📅 WEEK 3: Validate Top Pain Points (Feb 3-9)

### **Monday (Feb 3): Merchant A Feedback Call**
**Time**: 45 min  
**Questions**: See PHASE2-STRATEGY-DECISION.md

**Topics to Cover**:
- [ ] Chama/group orders (frequency, pain level)
- [ ] Supplier credit (tracking, forgetting payments)
- [ ] SMS marketing (current approach, barriers)
- [ ] Tax/license tracking (penalties, reminders needed)
- [ ] Fuliza payment failures (frequency, handling)
- [ ] Agent banking (if applicable, cash confusion)
- [ ] Overall satisfaction (1-10)
- [ ] Top 3 requested features

### **Wednesday (Feb 5): Merchant B Feedback Call**
- [ ] Same questions as Merchant A
- [ ] Compare answers
- [ ] Look for patterns

### **Friday (Feb 7): Merchant C Feedback Call**
- [ ] Same questions
- [ ] Synthesize all feedback
- [ ] Identify top 3 features

### **Weekend (Feb 8-9): Feature Prioritization**
- [ ] Apply Rule of 2: Build if 2+ merchants request it
- [ ] Estimate effort (5-7 days per feature)
- [ ] Create feature specs for top 3
- [ ] Create database migrations for top 3
- [ ] Plan Weeks 4-6 builds
- [ ] Update project roadmap

**📊 Week 3 Success Criteria**:
- ✅ 3 feedback calls completed
- ✅ Top 3 features validated
- ✅ Feature specs written
- ✅ Migrations planned

---

## 📅 WEEK 4-5: Build Feature #1 (Feb 10-23)

### **Week 4 (Feb 10-16): Build Feature #1**

**Monday (Feb 10): Spec Finalization**
- [ ] Review feature spec
- [ ] Confirm database schema
- [ ] Write migration script
- [ ] Create Edge Function stubs
- [ ] Design UI mockups

**Tuesday-Thursday (Feb 11-13): Development**
- [ ] Apply database migration
- [ ] Build Edge Functions
- [ ] Build UI components
- [ ] Write tests
- [ ] Test locally
- [ ] Fix bugs

**Friday (Feb 14): Deploy & Test**
- [ ] Deploy Edge Functions
- [ ] Deploy UI changes
- [ ] Test with 3 merchants
- [ ] Monitor for errors
- [ ] Collect initial feedback

**Weekend (Feb 15-16): Bug Fixes**
- [ ] Fix critical bugs
- [ ] Improve UX based on feedback
- [ ] Monitor usage

### **Week 5 (Feb 17-23): Polish Feature #1 & Start Feature #2**

**Monday-Tuesday (Feb 17-18): Feature #1 Polish**
- [ ] Fix remaining bugs
- [ ] Add missing edge cases
- [ ] Improve error messages
- [ ] Update documentation

**Wednesday-Sunday (Feb 19-23): Start Feature #2**
- [ ] Finalize spec
- [ ] Write migration
- [ ] Create Edge Function stubs
- [ ] Start development

**📊 Week 4-5 Success Criteria**:
- ✅ Feature #1 shipped and working
- ✅ 2+ merchants actively using
- ✅ No critical bugs
- ✅ Feature #2 development started

---

## 📅 WEEK 6: Build Feature #2 & #3 (Feb 24 - Mar 2)

### **Monday-Wednesday (Feb 24-26): Feature #2**
- [ ] Complete development
- [ ] Write tests
- [ ] Deploy
- [ ] Test with merchants

### **Thursday-Sunday (Feb 27 - Mar 2): Feature #3**
- [ ] Finalize spec
- [ ] Write migration
- [ ] Build Edge Functions
- [ ] Build UI
- [ ] Deploy
- [ ] Test with merchants

**📊 Week 6 Success Criteria**:
- ✅ Feature #2 shipped and working
- ✅ Feature #3 shipped and working
- ✅ All 3 features deployed
- ✅ No critical bugs

---

## 📅 WEEK 7: Iterate & Fix (Mar 3-9)

### **Monday-Wednesday (Mar 3-5): Bug Fixes**
- [ ] Fix bugs from Weeks 4-6
- [ ] Improve UX based on feedback
- [ ] Add missing edge cases
- [ ] Optimize performance (if needed)

### **Thursday-Friday (Mar 6-7): Documentation**
- [ ] Update PHASE1-COMPLETE.md
- [ ] Create PHASE2-COMPLETE.md
- [ ] Document feature usage
- [ ] Update README
- [ ] Create merchant case studies

### **Weekend (Mar 8-9): Merchant Check-Ins**
- [ ] Check-in with all 3 merchants
- [ ] Measure satisfaction (1-10)
- [ ] Track feature usage
- [ ] Collect testimonials

**📊 Week 7 Success Criteria**:
- ✅ All bugs fixed
- ✅ Features working smoothly
- ✅ Documentation updated
- ✅ Merchants satisfied (8/10+)

---

## 📅 WEEK 8: Scale Prep (Mar 10-17)

### **Monday-Tuesday (Mar 10-11): Onboard 2 More Merchants**
- [ ] Contact 5 new merchants
- [ ] Select 2 best-fit
- [ ] Onboard Merchant D
- [ ] Onboard Merchant E
- [ ] Test all features with new merchants

### **Wednesday-Thursday (Mar 12-13): Metrics Review**
- [ ] Calculate churn rate
- [ ] Measure merchant satisfaction (all 5)
- [ ] Review feature adoption
- [ ] Measure revenue growth per merchant
- [ ] Document learnings

### **Friday-Sunday (Mar 14-17): Q2 Planning**
- [ ] Create Q2 roadmap
- [ ] Decide: Scale to more merchants OR build more features?
- [ ] Plan next 3 features (if validated)
- [ ] Plan marketing strategy (if scaling)
- [ ] Document Phase 2 completion

**📊 Week 8 Success Criteria**:
- ✅ 5 merchants actively using
- ✅ 90%+ retention
- ✅ 8/10+ satisfaction
- ✅ 70%+ feature adoption
- ✅ Q2 roadmap ready

---

## 📊 DAILY CHECKLIST (Weeks 2-8)

### **Every Morning** ☀️
- [ ] Check Sentry for errors
- [ ] Check Supabase logs
- [ ] Review yesterday's metrics
- [ ] Check merchant WhatsApp for issues

### **Every Evening** 🌙
- [ ] Verify daily SMS summary sent (18:00)
- [ ] Track 10 key metrics
- [ ] Respond to any pending merchant questions
- [ ] Plan tomorrow's tasks

---

## 🎯 OVERALL SUCCESS CRITERIA (End of Week 8)

### **Merchant Metrics**
- ✅ 5 merchants actively using daily
- ✅ 95%+ message parsing accuracy
- ✅ 98%+ M-Pesa payment success rate
- ✅ 90%+ monthly retention
- ✅ 8/10+ merchant satisfaction

### **Technical Metrics**
- ✅ 99.9%+ uptime
- ✅ <500ms average response time
- ✅ Zero data loss incidents
- ✅ All webhooks reliable

### **Feature Metrics**
- ✅ 3 features shipped and validated
- ✅ 70%+ feature adoption (merchants use 2+ features)
- ✅ Measurable ROI per feature

### **Business Metrics**
- ✅ Merchants process 50+ orders/week via WhatsApp
- ✅ +20-30% revenue growth (if features work)
- ✅ Merchants recommend to other merchants
- ✅ Clear path to 20+ merchants in Q2

---

## 🚨 RED FLAGS (Escalate Immediately)

### **Week 2**
- ⚠️ Merchant can't complete onboarding
- ⚠️ Parsing accuracy <80%
- ⚠️ M-Pesa success rate <90%
- ⚠️ Critical bugs blocking usage

### **Week 3**
- ⚠️ No clear top 3 features
- ⚠️ Merchants not engaged in feedback
- ⚠️ Features don't align with research

### **Week 4-6**
- ⚠️ Feature taking >7 days to build
- ⚠️ Merchants not using features
- ⚠️ Critical bugs not fixed in 24 hrs

### **Week 8**
- ⚠️ Retention <70%
- ⚠️ Satisfaction <7/10
- ⚠️ Feature adoption <50%

---

## 💡 TIPS FOR SUCCESS

### **Stay Focused**
- Build only top 3 features (no scope creep)
- One feature at a time (no parallel builds)
- Fix bugs before starting next feature

### **Communicate Daily**
- Daily WhatsApp check-ins with merchants
- Respond within 2 hours during business hours
- Weekly feedback calls

### **Measure Everything**
- Track 10 key metrics daily
- Document learnings in BUILD-LOG.md
- Use data to make decisions

### **Stay Sustainable**
- 10 hours/week max (no burnout)
- Use Claude for 70% of coding
- Rest on weekends (except critical bugs)

---

**Last Updated**: January 17, 2026  
**Status**: Ready to Execute  
**Next Review**: Weekly (every Friday)
