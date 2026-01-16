# 🔐 Kenya Commerce OS - Credentials Reference

> **SECURITY NOTE:** This file is for your reference only. Do NOT commit to git.
> Add to `.gitignore` if sharing repo.

---

## ✅ Supabase (Connected & Deployed)

### Project Details
- **Project Name**: Kenya Commerce OS
- **Project URL**: `https://wwjsvzhosbrsotmknrtp.supabase.co`
- **Project Ref**: `wwjsvzhosbrsotmknrtp`
- **Region**: (Check Supabase dashboard)

### API Keys (Added to `.env.local`)

```bash
# Public (safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://wwjsvzhosbrsotmknrtp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anN2emhvc2Jyc290bWtucnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDA1NTMsImV4cCI6MjA4Mzk3NjU1M30.LluQURK5Hy0fBuMmvJourIGosFgLxzrvhO9GbwKcJHs

# Publishable Key (modern, recommended)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DtuFBdgOyfPDGJePkoPZEw_s50ZlccG

# Service Role Key (SENSITIVE - backend only)
# Get from: Supabase Dashboard > Settings > API
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Database
- **Status**: ✅ 7 tables deployed with RLS
- **Migrations**: 4 migrations applied
- **Access**: Via Supabase Studio or MCP tools

---

## 🔜 M-Pesa (To Be Configured)

### Daraja API (Sandbox)
- **Shortcode**: (Pending - apply at developer.safaricom.co.ke)
- **Consumer Key**: (Will receive after approval)
- **Consumer Secret**: (Will receive after approval)
- **Passkey**: (For STK Push)
- **Callback URL**: (Your ngrok or production URL)

**Status**: 🟡 Deferred to Days 5-6

### Environment Variables (To Add Later)
```bash
MPESA_CONSUMER_KEY=<your-consumer-key>
MPESA_CONSUMER_SECRET=<your-consumer-secret>
MPESA_SHORTCODE=<your-shortcode>
MPESA_PASSKEY=<your-passkey>
MPESA_CALLBACK_URL=<your-callback-url>
MPESA_ENVIRONMENT=sandbox  # or 'production'
```

---

## 🔜 Africa's Talking (To Be Configured)

### SMS API
- **Username**: (Your Africa's Talking username)
- **API Key**: (Generate at africastalking.com)
- **Sender ID**: (Your approved sender ID)

**Status**: 🟡 Deferred to Day 11

### Environment Variables (To Add Later)
```bash
AFRICASTALKING_USERNAME=<your-username>
AFRICASTALKING_API_KEY=<your-api-key>
AFRICASTALKING_SENDER_ID=<your-sender-id>
```

---

## 🔜 Meta WhatsApp Cloud API (To Be Configured)

### Business Details
- **Business Manager ID**: (From business.facebook.com)
- **WhatsApp Business Account ID**: (WABA ID)
- **Phone Number ID**: (From Meta Business Suite)
- **Access Token**: (Long-lived token)

**Status**: 🟡 To be configured on Day 4

### Environment Variables (To Add Later)
```bash
WHATSAPP_ACCESS_TOKEN=<your-access-token>
WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<your-waba-id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random-string-you-create>
```

---

## 📝 Quick Links

### Supabase
- Dashboard: https://supabase.com/dashboard
- Studio: https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp
- API Docs: https://supabase.com/docs

### M-Pesa
- Daraja Portal: https://developer.safaricom.co.ke
- API Docs: https://developer.safaricom.co.ke/Documentation

### Africa's Talking
- Dashboard: https://account.africastalking.com
- API Docs: https://developers.africastalking.com

### WhatsApp
- Business Manager: https://business.facebook.com
- Cloud API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

---

## 🔒 Security Reminders

1. ✅ Never commit `.env.local` or this file to git
2. ✅ Use service role key only in server-side code
3. ✅ Rotate keys if accidentally exposed
4. ✅ Use webhook verify tokens for all webhooks
5. ✅ Store secrets in environment variables, not code

---

**Last Updated**: January 16, 2026  
**Status**: Day 1 Complete - Supabase Connected ✅
