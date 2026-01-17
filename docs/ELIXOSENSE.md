# ElixoSense - First Client Requirements

## Business Overview
ElixoSense is an e-commerce business selling health and wellness products in Kenya. They are the first client/tenant on Kenya Commerce OS.

## Current Operations
- E-commerce website (existing)
- WhatsApp for customer orders
- M-Pesa for payments
- Manual order tracking (spreadsheets)
- Manual payment reconciliation

## Pain Points
1. **Order Chaos**: Messages scattered across WhatsApp, hard to track
2. **Payment Matching**: Manual work to link M-Pesa to orders
3. **Customer History**: No way to see past orders for a customer
4. **Inventory**: No sync between website and WhatsApp orders
5. **Offline Issues**: Internet drops, lose track of orders

## Requirements for MVP

### Core Features
- ✅ WhatsApp message ingestion (all orders in one place)
- ✅ M-Pesa auto-linking (payment → order matching)
- ✅ Customer profiles (phone-based, order history)
- ✅ Order dashboard (today, pending, completed)
- ✅ Quick actions (send payment request, mark fulfilled)

### Integration Requirements
- WhatsApp Business API (Meta Cloud API)
- M-Pesa STK Push (Safaricom Daraja)
- E-commerce website sync (API or webhook)
- SMS fallback (if WhatsApp blocked)

### User Experience
- Swahili UI (primary language)
- Mobile-first (owner uses phone)
- Offline-capable (internet is unreliable)
- Fast (< 2 sec page loads)

## ElixoSense Configuration

### Business Details
```json
{
  "business_id": "elixosense",
  "business_name": "ElixoSense Kenya",
  "owner_name": "TBD",
  "owner_phone": "+254XXXXXXXXX",
  "whatsapp_number": "+254XXXXXXXXX",
  "mpesa_shortcode": "XXXXXX",
  "mpesa_paybill": "XXXXXX",
  "language_default": "sw",
  "timezone": "Africa/Nairobi",
  "currency": "KES"
}
```

### Product Categories
- Health supplements
- Wellness products
- Personal care
- Beauty products

### Payment Methods
- M-Pesa (primary)
- Bank transfer (manual verification)
- Cash on delivery

### Delivery
- Nairobi: 1-2 days
- Outside Nairobi: 3-5 days
- Pickup available

## Success Criteria (30 Days)

### Quantitative
- 100% WhatsApp orders captured
- 90% M-Pesa payments auto-linked
- <5 min average time to send payment request
- 50+ orders processed

### Qualitative
- Owner says "easier than spreadsheets"
- Can operate offline during internet drops
- No missed orders due to system issues
- Customers happy with response time

## Future Enhancements (Phase 2)
- Website inventory sync (real-time stock)
- Customer catalog (browse products in WhatsApp)
- Loyalty program (points for repeat customers)
- Basic analytics (top products, revenue trends)
- Multi-user (add staff members)

## Technical Notes

### WhatsApp Setup
- Meta Business Account: TBD
- Phone Number: TBD
- Webhook URL: `https://kenya-commerce-os.vercel.app/api/webhooks/whatsapp/elixosense`
- Verify Token: (stored in Supabase secrets)

### M-Pesa Setup
- Daraja API credentials: TBD
- Shortcode: TBD
- Callback URL: `https://kenya-commerce-os.vercel.app/api/webhooks/mpesa/elixosense`

### Database
- Tenant ID: `elixosense`
- RLS policies: isolated data
- Supabase project: (shared with other tenants)

## Contact
- Business Owner: [Name]
- Technical Contact: Solo dev (me)
- Support: Via WhatsApp

---

**Status**: First tenant, active development  
**Launch Target**: Q1 2026  
**Last Updated**: January 16, 2026
