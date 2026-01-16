# 🚀 Quick Start: Get Kamau Live in 30 Minutes

**Goal**: Get the WhatsApp auto-reply system working for Kamau TODAY.

## Prerequisites

You need:
1. A WhatsApp Business API account (Meta Developer Portal)
2. M-Pesa Daraja API credentials (Safaricom)
3. Africa's Talking account (for SMS)
4. Access to Supabase Dashboard

## Step 1: Set Environment Variables (10 minutes)

Go to [Supabase Edge Function Settings](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/settings/functions) and add these secrets:

### WhatsApp (Required)
```
WHATSAPP_PHONE_NUMBER_ID=<from Meta Developer Portal>
WHATSAPP_ACCESS_TOKEN=<from Meta Developer Portal>
WHATSAPP_VERIFY_TOKEN=<any random string you choose>
WHATSAPP_APP_SECRET=<from Meta App Settings>
```

### M-Pesa (Required)
```
MPESA_CONSUMER_KEY=<from Daraja Portal>
MPESA_CONSUMER_SECRET=<from Daraja Portal>
MPESA_SHORTCODE=<your business shortcode>
MPESA_PASSKEY=<from Daraja Portal>
MPESA_CALLBACK_URL=https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/mpesa-callback
```

### SMS (Required for daily summary)
```
AFRICASTALKING_API_KEY=<from Africa's Talking>
AFRICASTALKING_USERNAME=<from Africa's Talking>
BUSINESS_OWNER_PHONE=+254712345678
```

## Step 2: Configure WhatsApp Webhook (5 minutes)

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Select your app → WhatsApp → Configuration
3. Click "Edit" next to Webhook
4. Enter:
   - **Callback URL**: `https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: Same as `WHATSAPP_VERIFY_TOKEN` above
5. Click "Verify and Save"
6. Subscribe to `messages` field

## Step 3: Test WhatsApp Auto-Reply (5 minutes)

Send this message to your WhatsApp Business number:

```
sukari 2kg
```

**Expected response:**
```
Asante! Oda yako: sukari 2 kg
Jumla: KSh 400
Subiri prompt ya M-Pesa kulipa.
```

You should also receive an M-Pesa STK Push on your phone.

## Step 4: Set Up Daily SMS Summary (5 minutes)

Connect to your Supabase database and run:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get your anon key from: https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/settings/api
-- Replace YOUR_ANON_KEY below with the actual key

-- Schedule daily summary at 7 PM EAT (4 PM UTC)
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
```

## Step 5: Test Daily Summary (5 minutes)

Manually trigger the daily summary:

```bash
curl -X POST \
  'https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/daily-summary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

Replace `YOUR_ANON_KEY` with your anon key from [API settings](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/settings/api).

You should receive an SMS like:
```
ElixoSense Leo:
Mapato: KSh 400
Oda: 1
Zinasubiri: 1 (KSh 400)
```

## ✅ You're Live!

If all tests passed, you're ready to go! Tell Kamau to start sharing the WhatsApp number with customers.

## 🐛 Troubleshooting

### WhatsApp not responding?
- Check [Edge Function logs](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions/whatsapp-webhook/logs)
- Verify webhook is subscribed to `messages` in Meta portal
- Check `WHATSAPP_VERIFY_TOKEN` matches in both places

### M-Pesa not working?
- Check [Edge Function logs](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions/generate-payment-link/logs)
- Verify M-Pesa credentials are correct
- Ensure phone number is M-Pesa registered

### SMS not received?
- Check [Edge Function logs](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions/daily-summary/logs)
- Verify Africa's Talking credentials
- Check phone number format (+254...)
- Ensure sufficient SMS balance

## 📊 Monitor Usage

Check today's stats:

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
```

## 🎯 Success Metrics

Track these daily:
- **Orders**: Target 50+ in 7 days
- **Auto-reply success**: Target 90%+
- **STK Push success**: Target 80%+
- **Kamau's manual work**: Target <5 interventions/day

## 📚 Full Documentation

For detailed setup, troubleshooting, and advanced features, see:
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Complete deployment guide
- [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) - Comprehensive checklist

---

**Remember**: Get Kamau making money TODAY. Everything else can wait! 🚀
