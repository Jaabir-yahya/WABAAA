# ✅ ElixoSense Setup Checklist

Use this checklist to ensure everything is configured correctly for Kamau's WhatsApp auto-reply system.

## 🔑 1. WhatsApp Business API Setup

### Required from Meta Developer Portal

- [ ] **Meta Developer Account** created at https://developers.facebook.com
- [ ] **WhatsApp Business App** created in Meta portal
- [ ] **Phone Number** registered and verified with WhatsApp Business API
- [ ] **Phone Number ID** obtained from API Setup page
- [ ] **Access Token** generated (permanent System User token recommended)
- [ ] **Verify Token** created (any random string you choose)
- [ ] **App Secret** obtained from App Settings > Basic

### Environment Variables to Set

```bash
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=your_random_verify_token_123
WHATSAPP_APP_SECRET=abcdef1234567890abcdef1234567890
```

### Webhook Configuration

- [ ] Webhook URL configured: `https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook`
- [ ] Verify token matches the one in environment variables
- [ ] Webhook verified successfully (green checkmark in Meta portal)
- [ ] Subscribed to `messages` webhook field

## 💳 2. M-Pesa Daraja API Setup

### Required from Safaricom Daraja Portal

- [ ] **Daraja Account** created at https://developer.safaricom.co.ke
- [ ] **App** created in Daraja portal
- [ ] **Consumer Key** obtained
- [ ] **Consumer Secret** obtained
- [ ] **Business Shortcode** (Paybill or Till Number)
- [ ] **Passkey** obtained for STK Push
- [ ] **Callback URL** registered with Safaricom

### Environment Variables to Set

```bash
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/mpesa-callback
```

### Testing

- [ ] M-Pesa STK Push working in sandbox/production
- [ ] Callback URL receiving payment confirmations
- [ ] Payments being recorded in `payments` table

## 📱 3. Africa's Talking SMS Setup

### Required from Africa's Talking

- [ ] **Account** created at https://account.africastalking.com
- [ ] **API Key** generated from Dashboard > Settings
- [ ] **Username** obtained (usually your account username)
- [ ] **SMS balance** sufficient for daily summaries

### Environment Variables to Set

```bash
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_USERNAME=your_username
BUSINESS_OWNER_PHONE=+254712345678
```

### Testing

- [ ] Manual SMS test successful
- [ ] Daily summary SMS received at 7 PM EAT

## 🗄️ 4. Database Setup

### Tables

- [ ] `businesses` table exists with ElixoSense tenant
- [ ] `commerce_events` table exists (event sourcing)
- [ ] `orders` table exists (operational state)
- [ ] `payments` table exists (operational state)
- [ ] Row Level Security (RLS) enabled on all tables

### Verify Data

```sql
-- Check ElixoSense business exists
SELECT * FROM businesses WHERE id = 'elixosense';

-- Check recent events
SELECT * FROM commerce_events ORDER BY occurred_at DESC LIMIT 5;

-- Check recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- Check recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;
```

## 🚀 5. Edge Functions Deployment

### Functions Deployed

- [ ] `whatsapp-webhook` - v1 or higher
- [ ] `daily-summary` - v1 or higher
- [ ] `generate-payment-link` - v3 or higher
- [ ] `mpesa-callback` - v3 or higher

### Verify Deployment

Visit each URL and check for 200 or 405 response (not 404):

- [ ] https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook
- [ ] https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary
- [ ] https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/generate-payment-link
- [ ] https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/mpesa-callback

## 🧪 6. End-to-End Testing

### Test 1: Simple Order

1. [ ] Send WhatsApp message: `sukari 2kg`
2. [ ] Receive auto-reply: `Asante! Oda yako: sukari 2 kg\nJumla: KSh 400\nSubiri prompt ya M-Pesa kulipa.`
3. [ ] Receive M-Pesa STK Push on phone
4. [ ] Complete payment
5. [ ] Verify order in database: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;`
6. [ ] Verify payment in database: `SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;`

### Test 2: Multi-Item Order

1. [ ] Send WhatsApp message: `maziwa 2 lita na unga 1kg`
2. [ ] Receive auto-reply with correct total (KSh 340)
3. [ ] Receive M-Pesa STK Push
4. [ ] Verify order items in database

### Test 3: Unrecognized Product

1. [ ] Send WhatsApp message: `bananas 5`
2. [ ] Receive auto-reply: `Samahani, sijaelewa bidhaa. Tafadhali taja bidhaa na kiasi, mfano: sukari 2kg.`

### Test 4: Payment Inquiry

1. [ ] Send WhatsApp message: `nimelipa`
2. [ ] Receive auto-reply: `Asante! Kama umelipa tayari, tutathibitisha malipo yako hivi karibuni.`

### Test 5: General Inquiry

1. [ ] Send WhatsApp message: `hello`
2. [ ] Receive auto-reply: `Karibu! Tuma oda yako kwa mfano: sukari 2kg na maziwa 1 lita.`

### Test 6: Daily Summary

1. [ ] Manually trigger: `curl -X POST https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary -H "Authorization: Bearer YOUR_ANON_KEY"`
2. [ ] Receive SMS on `BUSINESS_OWNER_PHONE`
3. [ ] Verify SMS content matches database totals

### Test 7: Business Hours

1. [ ] Send message outside business hours (before 7 AM or after 8 PM EAT)
2. [ ] Verify NO auto-reply is sent
3. [ ] Verify message is logged in `commerce_events` with `auto_response_allowed: false`

### Test 8: Rate Limiting

1. [ ] Send 6+ messages within 60 seconds from same number
2. [ ] Verify rate limit policy violation logged
3. [ ] Verify no auto-reply after 5th message

## ⏰ 7. Scheduled Tasks

### pg_cron Setup

- [ ] `pg_cron` extension enabled
- [ ] Daily summary scheduled for 7 PM EAT (4 PM UTC)
- [ ] Cron job visible in `cron.job` table
- [ ] Test cron job execution

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily summary
SELECT cron.schedule(
  'daily-summary-7pm',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify scheduled job
SELECT * FROM cron.job WHERE jobname = 'daily-summary-7pm';
```

## 📊 8. Monitoring Setup

### Supabase Dashboard

- [ ] Edge Function logs accessible
- [ ] Database logs accessible
- [ ] Real-time subscriptions working (optional)

### Database Queries

Save these queries for monitoring:

```sql
-- Today's orders
SELECT COUNT(*), SUM(total_amount) 
FROM orders 
WHERE business_id = 'elixosense' 
  AND created_at >= CURRENT_DATE;

-- Today's revenue
SELECT SUM(applied_amount) 
FROM payments 
WHERE business_id = 'elixosense' 
  AND status = 'confirmed'
  AND created_at >= CURRENT_DATE;

-- Recent policy violations
SELECT * FROM commerce_events 
WHERE event_type = 'merchant_note'
  AND payload->>'note_type' = 'whatsapp_policy_guard'
ORDER BY occurred_at DESC 
LIMIT 10;

-- Failed auto-replies
SELECT * FROM commerce_events 
WHERE event_type = 'whatsapp_message_out'
  AND processing_status = 'failed'
ORDER BY occurred_at DESC 
LIMIT 10;
```

## 🎯 9. Success Metrics (Track Daily)

- [ ] **Orders processed**: Target 50+ in 7 days
- [ ] **Auto-reply success rate**: Target 90%+
- [ ] **STK Push success rate**: Target 80%+
- [ ] **Payment confirmation rate**: Target 70%+
- [ ] **Daily SMS delivery**: Target 100%
- [ ] **Kamau's manual intervention**: Target <5 per day

## 🔧 10. Troubleshooting Resources

### Common Issues

1. **WhatsApp webhook not receiving messages**
   - Check webhook verification in Meta portal
   - Verify `WHATSAPP_VERIFY_TOKEN` matches
   - Check Edge Function logs for errors

2. **M-Pesa STK Push not working**
   - Verify phone number is M-Pesa registered
   - Check Daraja credentials are correct
   - Ensure callback URL is whitelisted

3. **Daily SMS not received**
   - Check Africa's Talking balance
   - Verify phone number format (+254...)
   - Check Edge Function logs

4. **Auto-replies not sent**
   - Check business hours (7 AM - 8 PM EAT)
   - Verify rate limiting not triggered
   - Check Edge Function logs

### Support Resources

- **Edge Function Logs**: https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions
- **Database Logs**: https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/logs
- **Meta Developer Support**: https://developers.facebook.com/support
- **Safaricom Daraja Support**: https://developer.safaricom.co.ke/support
- **Africa's Talking Support**: https://help.africastalking.com

## ✅ Final Verification

Before going live with Kamau:

- [ ] All environment variables set in Supabase
- [ ] All Edge Functions deployed and accessible
- [ ] WhatsApp webhook verified and subscribed
- [ ] M-Pesa integration tested and working
- [ ] Daily SMS tested and working
- [ ] End-to-end order flow tested (WhatsApp → Order → Payment)
- [ ] Business hours policy tested
- [ ] Rate limiting tested
- [ ] Database monitoring queries saved
- [ ] Kamau trained on how to check orders in PWA (optional)
- [ ] Kamau's phone number set as `BUSINESS_OWNER_PHONE`

## 🚀 Go Live!

Once all checkboxes are ✅:

1. **Announce to Kamau**: "Your WhatsApp auto-reply system is live!"
2. **Share WhatsApp number**: Give customers the WhatsApp Business number
3. **Monitor first day**: Check logs and database frequently
4. **Daily check-in**: Review daily SMS summary with Kamau
5. **Week 1 review**: Assess success metrics and adjust as needed

---

**Remember**: The goal is to get Kamau processing orders TODAY. If something doesn't work perfectly, fix it quickly and keep moving forward. Perfect is the enemy of done!
