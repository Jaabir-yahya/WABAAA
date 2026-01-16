# ElixoSense WhatsApp Webhook Configuration

## Step 1: Deploy the Edge Function
```bash
supabase functions deploy whatsapp-webhook
```

## Step 2: Webhook URL
```
https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook
```

## Step 3: Meta Webhook Registration
1. Open Meta Business Platform.
2. Go to WhatsApp Business App → Configuration.
3. Set Webhook URL to the function URL above.
4. Set Verify Token to `WHATSAPP_VERIFY_TOKEN` (from `.env.local`).
5. Subscribe to `messages` webhook event.

## Step 4: Verify Challenge (Manual)
```bash
curl "https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```
Expected response: `test123`

## Step 5: Add App Secret
In Meta App Settings, copy the App Secret and set:
```bash
WHATSAPP_APP_SECRET=<meta-app-secret>
```
