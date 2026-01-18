# 🔍 Verify WhatsApp Setup

This guide helps you verify that your WhatsApp Business API is correctly configured.

## WhatsApp Webhook Requirements (Meta)

According to Meta's WhatsApp Cloud API documentation, you need:

### 1. Webhook Verification (GET Request)

When you configure the webhook in Meta portal, Meta sends a GET request to verify your endpoint:

```
GET https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

**Your endpoint must:**
- ✅ Check that `hub.mode` equals `"subscribe"`
- ✅ Check that `hub.verify_token` matches your `WHATSAPP_VERIFY_TOKEN`
- ✅ Return the `hub.challenge` value as plain text with 200 status

**Status**: ✅ Implemented in `whatsapp-webhook/index.ts` (lines 217-227)

### 2. Webhook Signature Verification (POST Request)

When Meta sends messages to your webhook, it includes a signature header:

```
x-hub-signature-256: sha256=<signature>
```

**Your endpoint must:**
- ✅ Extract the signature from `x-hub-signature-256` header
- ✅ Compute HMAC-SHA256 of the raw request body using your App Secret
- ✅ Compare the computed signature with the received signature (timing-safe comparison)
- ✅ Reject requests with invalid signatures (401 Unauthorized)

**Status**: ✅ Implemented in `whatsapp-webhook/index.ts` (lines 161-195)

### 3. Message Subscription

You must subscribe to the `messages` webhook field in Meta portal.

**Status**: ⚠️ **ACTION REQUIRED** - You must manually subscribe in Meta portal

### 4. Required Environment Variables

```bash
WHATSAPP_PHONE_NUMBER_ID=<your_phone_number_id>
WHATSAPP_ACCESS_TOKEN=<your_access_token>
WHATSAPP_VERIFY_TOKEN=<your_verify_token>
WHATSAPP_APP_SECRET=<your_app_secret>
```

**Status**: ⚠️ **ACTION REQUIRED** - You must set these in Supabase

## Verification Steps

### Step 1: Check Edge Function is Deployed

```bash
curl https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook
```

**Expected**: 405 Method Not Allowed (or 403 Forbidden)
**Not Expected**: 404 Not Found

### Step 2: Test Webhook Verification (Simulated)

This simulates what Meta does when you configure the webhook:

```bash
curl "https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

Replace `YOUR_VERIFY_TOKEN` with your actual verify token.

**Expected**: `test123` (the challenge value)
**Not Expected**: `Forbidden` or error

### Step 3: Configure Webhook in Meta Portal

1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to **WhatsApp > Configuration**
4. Click "Edit" next to "Webhook"
5. Enter:
   - **Callback URL**: `https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: Your `WHATSAPP_VERIFY_TOKEN`
6. Click "Verify and Save"

**Expected**: Green checkmark ✅
**Not Expected**: Red X ❌ or error message

### Step 4: Subscribe to Messages

In the same Configuration page:

1. Find "Webhook fields"
2. Click "Manage" or "Subscribe"
3. Check the box for `messages`
4. Save

**Expected**: `messages` shows as subscribed

### Step 5: Send Test Message

Send a WhatsApp message to your business number:

```
sukari 2kg
```

**Expected**:
1. You receive an auto-reply within 5 seconds
2. You receive an M-Pesa STK Push prompt
3. Order is created in database

**Check logs**:
```bash
# Check Edge Function logs
https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions/whatsapp-webhook/logs

# Check database events
SELECT * FROM commerce_events 
WHERE event_type = 'whatsapp_message_in' 
ORDER BY occurred_at DESC 
LIMIT 1;
```

## Common Issues

### Issue 1: Webhook Verification Fails

**Symptom**: Red X when configuring webhook in Meta portal

**Causes**:
- `WHATSAPP_VERIFY_TOKEN` not set in Supabase
- Verify token in Meta portal doesn't match the one in Supabase
- Edge Function not deployed or not accessible

**Fix**:
1. Check Edge Function is accessible: `curl https://wwjsvzhosbrsotmknrtp.supabase.co/functions/v1/whatsapp-webhook`
2. Verify `WHATSAPP_VERIFY_TOKEN` is set in Supabase secrets
3. Test verification manually with curl command above
4. Check Edge Function logs for errors

### Issue 2: Messages Not Received

**Symptom**: Send message to WhatsApp, no auto-reply

**Causes**:
- Not subscribed to `messages` webhook field
- Invalid signature (wrong `WHATSAPP_APP_SECRET`)
- Edge Function error
- Outside business hours (7 AM - 8 PM EAT)
- Rate limited (>5 messages in 60 seconds)

**Fix**:
1. Check `messages` is subscribed in Meta portal
2. Verify `WHATSAPP_APP_SECRET` is correct
3. Check Edge Function logs for errors
4. Check time (must be 7 AM - 8 PM EAT)
5. Wait 60 seconds and try again if rate limited

### Issue 3: Auto-Reply Not Sent

**Symptom**: Message received (in logs) but no auto-reply

**Causes**:
- `WHATSAPP_PHONE_NUMBER_ID` or `WHATSAPP_ACCESS_TOKEN` not set
- Invalid access token
- WhatsApp API rate limit
- Outside business hours
- Auto-response cooldown (5 minutes between auto-replies to same customer)

**Fix**:
1. Verify `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are set
2. Check access token is valid (not expired)
3. Check Edge Function logs for WhatsApp API errors
4. Check time (must be 7 AM - 8 PM EAT)
5. Wait 5 minutes and try again

### Issue 4: M-Pesa STK Push Not Sent

**Symptom**: Auto-reply sent but no STK Push

**Causes**:
- M-Pesa credentials not set or invalid
- Phone number not M-Pesa registered
- M-Pesa API error

**Fix**:
1. Verify all M-Pesa environment variables are set
2. Check phone number is M-Pesa registered
3. Check `generate-payment-link` function logs
4. Test M-Pesa separately

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Edge Function deployed and accessible
- [ ] All environment variables set in Supabase
- [ ] Webhook verification successful (green checkmark in Meta portal)
- [ ] Subscribed to `messages` webhook field
- [ ] Test message sent: `sukari 2kg`
- [ ] Auto-reply received within 5 seconds
- [ ] M-Pesa STK Push received
- [ ] Order created in database
- [ ] Payment recorded after completing M-Pesa
- [ ] Daily SMS summary working

## Next Steps

Once all checks pass:

1. ✅ Mark `deploy-kamau` todo as completed
2. 📱 Give Kamau the WhatsApp Business number
3. 📢 Announce to customers
4. 📊 Monitor usage daily
5. 🎯 Track success metrics (target: 50+ orders in 7 days)

## Support

If you're stuck:

1. Check [Edge Function logs](https://supabase.com/dashboard/project/wwjsvzhosbrsotmknrtp/functions)
2. Query `commerce_events` for error details
3. Review [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for detailed troubleshooting
4. Check Meta Developer Portal for webhook status

---

**Remember**: The goal is to get Kamau making money TODAY. If something doesn't work, fix it quickly and move on! 🚀
