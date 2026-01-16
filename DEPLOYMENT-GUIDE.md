# 🚀 ElixoSense WhatsApp Auto-Reply Deployment Guide

**Goal**: Get Kamau processing 50+ orders via WhatsApp auto-replies TODAY.

## ✅ What's Already Done

- ✅ Edge Functions deployed:
  - `whatsapp-webhook` - Handles incoming WhatsApp messages and auto-replies
  - `daily-summary` - Sends daily SMS summary at 7 PM
  - `generate-payment-link` - Triggers M-Pesa STK Push
  - `mpesa-callback` - Handles M-Pesa payment confirmations

- ✅ Database schema ready (multi-tenant with RLS)
- ✅ Product prices configured (sukari: 200, maziwa: 80, unga: 180, mafuta: 350, sabuni: 50, dawa: 150)
- ✅ NairobiChaosParser for natural language order processing
- ✅ Svelte PWA for merchant dashboard (optional - not needed for auto-reply)

## 📋 Required Credentials

You need to configure the following environment variables in Supabase:

### 1. WhatsApp Business API Credentials

```bash
# From Meta Developer Portal (https://developers.facebook.com/apps)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=any_random_string_you_choose
WHATSAPP_APP_SECRET=your_app_secret
```

**How to get these:**

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Create or select your app
3. Add "WhatsApp" product
4. Go to **WhatsApp > API Setup**:
   - **Phone Number ID**: Found under "From" section
   - **Access Token**: Click "Generate token" (temporary) or create a System User access token (permanent, recommended)
   - **Verify Token**: Any random string you create (used for webhook verification)
   - **App Secret**: Found in **App Settings > Basic** (your App Secret, not access token)

### 2. M-Pesa Daraja API Credentials

```bash
# From Safaricom Daraja Portal (https://developer.safaricom.co.ke)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/mpesa-callback
```

**Note**: These should already be configured if M-Pesa integration is working.

### 3. Africa's Talking SMS Credentials

```bash
# From Africa's Talking Dashboard (https://account.africastalking.com)
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_USERNAME=your_username
```

**How to get these:**

1. Go to [Africa's Talking](https://account.africastalking.com)
2. Sign up or log in
3. Go to **Dashboard > Settings**:
   - **API Key**: Generate a new API key
   - **Username**: Your Africa's Talking username (usually "sandbox" for testing)

### 4. Business Configuration

```bash
# Kamau's phone number (to receive daily SMS summaries)
BUSINESS_OWNER_PHONE=+254712345678
```

## 🔧 Step-by-Step Deployment

### Step 1: Set Environment Variables in Supabase

Navigate to your [Supabase Dashboard](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/settings/functions):

1. Go to **Project Settings > Edge Functions**
2. Click on "Add new secret"
3. Add each of the environment variables above

**Alternative (using CLI if you have it set up):**

Create a `.env` file in the root:

```bash
# .env (DO NOT COMMIT THIS FILE)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=any_random_string
WHATSAPP_APP_SECRET=your_app_secret
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_USERNAME=your_username
BUSINESS_OWNER_PHONE=+254712345678
```

Then run:

```bash
supabase secrets set --env-file .env
```

### Step 2: Verify Edge Functions are Deployed

The functions are already deployed. You can verify by visiting:

- **WhatsApp Webhook**: https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook
- **Daily Summary**: https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary
- **Generate Payment Link**: https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/generate-payment-link
- **M-Pesa Callback**: https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/mpesa-callback

### Step 3: Configure WhatsApp Webhook in Meta Portal

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Select your app
3. Go to **WhatsApp > Configuration**
4. Click "Edit" next to "Webhook"
5. Enter:
   - **Callback URL**: `https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: The same `WHATSAPP_VERIFY_TOKEN` you set in environment variables
6. Click "Verify and Save"
7. Subscribe to webhook fields:
   - ✅ `messages` (required for receiving messages)

### Step 4: Test WhatsApp Auto-Reply

Send a test message to your WhatsApp Business number:

**Test message:**
```
sukari 2kg
```

**Expected response:**
```
Asante! Oda yako: sukari 2 kg
Jumla: KSh 400
Subiri prompt ya M-Pesa kulipa.
```

Then you should receive an M-Pesa STK Push on your phone.

### Step 5: Set Up Daily SMS Summary (7 PM EAT)

The daily summary is already deployed and configured to run at 7 PM Nairobi time.

To manually trigger it for testing:

```bash
curl -X POST \
  'https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

**Expected SMS (to BUSINESS_OWNER_PHONE):**
```
ElixoSense Leo:
Mapato: KSh 12,450
Oda: 27
Zinasubiri: 3 (KSh 850)
```

### Step 6: Schedule Daily Summary (pg_cron)

Connect to your Supabase database and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily summary at 7 PM EAT (4 PM UTC)
SELECT cron.schedule(
  'daily-summary-7pm',
  '0 16 * * *', -- 7 PM EAT = 4 PM UTC (EAT is UTC+3)
  $$
  SELECT net.http_post(
    url := 'https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Note**: You'll need to set the `app.settings.supabase_anon_key` configuration:

```sql
-- Set the anon key for the cron job
ALTER DATABASE postgres SET app.settings.supabase_anon_key TO 'YOUR_ANON_KEY';
```

Replace `YOUR_ANON_KEY` with your actual anon key from the [API settings page](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/settings/api).

## 🧪 Testing Checklist

- [ ] WhatsApp webhook verification successful in Meta portal
- [ ] Send "sukari 2kg" → Receive auto-reply with order confirmation
- [ ] Receive M-Pesa STK Push prompt
- [ ] Complete payment → Payment recorded in database
- [ ] Check `commerce_events` table for all logged events
- [ ] Check `orders` table for created order
- [ ] Check `payments` table for confirmed payment
- [ ] Manually trigger daily summary → Receive SMS
- [ ] Wait until 7 PM EAT → Receive automatic daily SMS summary

## 📊 Monitoring

### Check Logs

Go to [Edge Functions Logs](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions) and select each function to view logs.

### Check Database Events

```sql
-- View recent WhatsApp messages
SELECT * FROM commerce_events 
WHERE event_type IN ('whatsapp_message_in', 'whatsapp_message_out')
ORDER BY occurred_at DESC 
LIMIT 10;

-- View recent orders
SELECT * FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- View recent payments
SELECT * FROM payments 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Policy Violations

```sql
-- Check if messages are being rate-limited or blocked
SELECT * FROM commerce_events 
WHERE event_type = 'merchant_note'
  AND payload->>'note_type' = 'whatsapp_policy_guard'
ORDER BY occurred_at DESC 
LIMIT 10;
```

## 🔥 Success Metrics (7 Days)

- **Primary**: Kamau processes 50+ orders via WhatsApp auto-replies without touching PWA
- **Secondary**:
  - 90%+ orders automatically confirmed within 30 seconds
  - 80%+ orders result in successful M-Pesa STK Push
  - Daily SMS summary sent every day at 7 PM
  - Zero manual intervention needed for standard orders

## 🐛 Troubleshooting

### WhatsApp messages not received

1. Check webhook is subscribed to `messages` field in Meta portal
2. Verify `WHATSAPP_VERIFY_TOKEN` matches in both Meta portal and Supabase secrets
3. Check Edge Function logs for errors
4. Verify webhook URL is correct and publicly accessible

### M-Pesa STK Push not triggered

1. Check `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` are set
2. Verify `generate-payment-link` function logs for errors
3. Check if phone number is registered with M-Pesa

### Daily SMS not received

1. Verify `AFRICASTALKING_API_KEY` and `AFRICASTALKING_USERNAME` are correct
2. Check `BUSINESS_OWNER_PHONE` is in international format (+254...)
3. Verify Africa's Talking account has sufficient balance
4. Check `daily-summary` function logs for errors
5. Verify `pg_cron` job is scheduled correctly

### Auto-replies outside business hours

The system only auto-replies between 7 AM and 8 PM EAT. Outside these hours:
- Messages are still logged in `commerce_events`
- Orders are NOT automatically created
- No auto-replies are sent
- Check `payload->>'auto_response_allowed'` in events

## 📞 Support

If you encounter issues:

1. Check Edge Function logs: https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions
2. Query `commerce_events` table for error details
3. Review policy violations in database
4. Verify all environment variables are set correctly

## 🎯 Next Steps After Deployment

Once Kamau is successfully using the system:

1. **Week 1-2**: Monitor usage, fix bugs, adjust product prices
2. **Week 3-4**: Add SMS fallback for customers without WhatsApp
3. **Month 2**: Expand to additional merchants
4. **Month 3+**: Add inventory tracking, customer segments, etc.

---

**Remember**: The goal is to get Kamau making money TODAY. Everything else can wait.
