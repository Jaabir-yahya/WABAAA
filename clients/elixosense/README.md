# ElixoSense - First Client

## Overview
ElixoSense is the first tenant on Kenya Commerce OS. This directory contains their specific configuration and customizations.

## Files
- `config.json` - Business configuration (parser rules, auto-responses, etc.)
- `products.json` - Product catalog (optional, for future catalog feature)
- `README.md` - This file

## Setup Instructions

### 1. Update Configuration
Edit `config.json` and replace all `UPDATE_ME` placeholders with actual values:
- Owner contact information
- WhatsApp number
- M-Pesa shortcode/till number

### 2. Create Business in Database
```bash
cd ../../packages/database
npm run seed  # This creates elixosense business with test data
```

Or manually via SQL:
```sql
INSERT INTO businesses (id, name, owner_name, owner_phone, ...)
VALUES ('elixosense', 'ElixoSense Kenya', ...);
```

### 3. Configure Webhooks

#### WhatsApp Webhook
Meta WhatsApp Cloud API webhook URL:
```
https://your-domain.com/api/webhooks/whatsapp/elixosense
```

#### M-Pesa Callback
Daraja API callback URL:
```
https://your-domain.com/api/webhooks/mpesa/elixosense
```

### 4. Environment Variables
Set these in your hosting platform (Vercel, Supabase Edge Functions, etc.):

```bash
# ElixoSense WhatsApp
ELIXOSENSE_WA_PHONE_NUMBER_ID=your_phone_number_id
ELIXOSENSE_WA_ACCESS_TOKEN=your_access_token
ELIXOSENSE_WA_VERIFY_TOKEN=your_verify_token

# ElixoSense M-Pesa
ELIXOSENSE_MPESA_CONSUMER_KEY=your_consumer_key
ELIXOSENSE_MPESA_CONSUMER_SECRET=your_consumer_secret
ELIXOSENSE_MPESA_SHORTCODE=your_shortcode
ELIXOSENSE_MPESA_PASSKEY=your_passkey
```

## Testing

### Test Message Flow
1. Send a WhatsApp message to ElixoSense number:
   ```
   Nataka 2 kg sukari na maziwa lita 3
   ```

2. Check merchant dashboard - should see:
   - New message in inbox
   - Parsed order with items
   - Customer profile created

3. Send payment request from dashboard

4. Simulate M-Pesa callback (or use real payment):
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/mpesa/elixosense \
     -H "Content-Type: application/json" \
     -d @test-callback.json
   ```

5. Verify payment auto-linked to order

### Test Data
Sample WhatsApp messages to test parser:
```
Nataka 2 kg sukari na maziwa lita 3
I need sugar 2kg and milk 3 litres
Order sukari na maziwa
Nimelipa 690 bob kwa mpesa
Iko wapi oda yangu?
```

## Customization

### Adding Product Aliases
Edit `config.json` → `parser_rules.product_aliases`:
```json
{
  "your_product": ["alias1", "alias2", "typo_version"]
}
```

### Changing Auto-Responses
Edit `config.json` → `auto_responses`:
```json
{
  "payment_confirmed": {
    "sw": "Your Swahili message here",
    "en": "Your English message here"
  }
}
```

### Business Hours
Edit `config.json` → `contact.business_hours`

## Support

- Technical issues: Check main project docs
- Business configuration: This file
- Feature requests: Submit to project maintainer

## Notes

- This is the **first tenant** on Kenya Commerce OS
- Configuration format may evolve - keep this file updated
- All sensitive credentials should be in environment variables, NOT in this config file
