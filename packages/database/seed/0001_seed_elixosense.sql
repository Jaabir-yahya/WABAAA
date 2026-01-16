-- Seed: ElixoSense tenant (First Client)
-- Created: 2026-01-16
-- Description: Initial data for ElixoSense business

-- Insert ElixoSense business
INSERT INTO businesses (
    id,
    name,
    owner_name,
    owner_phone,
    owner_email,
    whatsapp_number,
    sms_number,
    mpesa_shortcode,
    language_default,
    timezone,
    currency,
    config,
    status,
    subscription_tier
) VALUES (
    'elixosense',
    'ElixoSense Kenya',
    'ElixoSense Owner', -- Update with real name
    '+254700000000', -- Update with real phone
    'owner@elixosense.co.ke', -- Update with real email
    '+254700000000', -- Update with WhatsApp number
    '+254700000000', -- Update with SMS number
    'XXXXXX', -- Update with M-Pesa shortcode
    'sw', -- Swahili default
    'Africa/Nairobi',
    'KES',
    '{
        "parser_rules": {
            "product_aliases": {
                "sukari": ["sugar", "suka"],
                "maziwa": ["milk", "mziwa"]
            }
        },
        "business_hours": {
            "monday": {"open": "08:00", "close": "18:00"},
            "tuesday": {"open": "08:00", "close": "18:00"},
            "wednesday": {"open": "08:00", "close": "18:00"},
            "thursday": {"open": "08:00", "close": "18:00"},
            "friday": {"open": "08:00", "close": "18:00"},
            "saturday": {"open": "09:00", "close": "14:00"},
            "sunday": {"closed": true}
        },
        "auto_responses": {
            "greeting": "Karibu ElixoSense! Tutakusaidia haraka. 🙂",
            "payment_request": "Asante! Tafadhali lipa KES {amount} kwa M-Pesa till {till_number}.",
            "payment_confirmed": "Ahsante! Malipo yamepokelewa. Oda yako inachakatwa.",
            "order_fulfilled": "Oda yako iko tayari! Asante kwa kufanya biashara nasi."
        },
        "notifications": {
            "low_inventory_threshold": 5,
            "daily_summary_time": "18:00"
        }
    }'::jsonb,
    'active',
    'free'
) ON CONFLICT (id) DO NOTHING;

-- Sample test events (for development)
INSERT INTO commerce_events (
    business_id,
    event_type,
    event_subtype,
    occurred_at,
    source_channel,
    source_id,
    customer_phone,
    customer_name,
    payload,
    idempotency_key,
    processing_status
) VALUES
-- Event 1: Inbound WhatsApp message
(
    'elixosense',
    'message',
    'inbound',
    NOW() - INTERVAL '2 hours',
    'whatsapp',
    'wamid.TEST001',
    '+254712345678',
    'John Kamau',
    '{
        "message_id": "wamid.TEST001",
        "body": "Nataka 2 kg sukari na maziwa lita 3",
        "from": "+254712345678",
        "timestamp": "1737033600"
    }'::jsonb,
    'wa:TEST001',
    'completed'
),
-- Event 2: Order created (parsed from message)
(
    'elixosense',
    'order',
    'created',
    NOW() - INTERVAL '2 hours',
    'whatsapp',
    NULL,
    '+254712345678',
    'John Kamau',
    '{
        "order_id": "ORD-TEST-001",
        "items": [
            {"product": "sukari", "quantity": 2, "unit": "kg", "price": 120},
            {"product": "maziwa", "quantity": 3, "unit": "lita", "price": 150}
        ],
        "total_amount": 690,
        "status": "pending_payment",
        "parsed_from": "wamid.TEST001"
    }'::jsonb,
    'order:TEST001',
    'completed'
),
-- Event 3: Payment request sent
(
    'elixosense',
    'message',
    'outbound',
    NOW() - INTERVAL '1 hour 50 minutes',
    'whatsapp',
    'wamid.TEST002',
    '+254712345678',
    'John Kamau',
    '{
        "message_id": "wamid.TEST002",
        "body": "Asante John! Jumla yako ni KES 690. Tafadhali lipa kwa M-Pesa till 123456.",
        "type": "text",
        "status": "sent"
    }'::jsonb,
    'wa:TEST002',
    'completed'
),
-- Event 4: M-Pesa payment received
(
    'elixosense',
    'payment',
    'received',
    NOW() - INTERVAL '1 hour 30 minutes',
    'mpesa',
    'MPESA-TEST-001',
    '+254712345678',
    'John Kamau',
    '{
        "transaction_id": "MPESA-TEST-001",
        "receipt_number": "RBK12345678",
        "amount": 690,
        "phone": "+254712345678",
        "status": "success",
        "linked_order_id": "ORD-TEST-001"
    }'::jsonb,
    'mpesa:TEST001',
    'completed'
),
-- Event 5: Order fulfilled
(
    'elixosense',
    'order',
    'fulfilled',
    NOW() - INTERVAL '30 minutes',
    'manual',
    NULL,
    '+254712345678',
    'John Kamau',
    '{
        "order_id": "ORD-TEST-001",
        "status": "fulfilled",
        "fulfilled_by": "owner",
        "notes": "Delivered"
    }'::jsonb,
    'order:TEST001:fulfilled',
    'completed'
);

-- Refresh views to include test data
SELECT refresh_all_views();

-- Verify seed data
DO $$
BEGIN
    RAISE NOTICE 'ElixoSense business created: %', (SELECT id FROM businesses WHERE id = 'elixosense');
    RAISE NOTICE 'Events created: %', (SELECT COUNT(*) FROM commerce_events WHERE business_id = 'elixosense');
    RAISE NOTICE 'Customers: %', (SELECT COUNT(*) FROM customers_view WHERE business_id = 'elixosense');
    RAISE NOTICE 'Orders: %', (SELECT COUNT(*) FROM orders_view WHERE business_id = 'elixosense');
    RAISE NOTICE 'Payments: %', (SELECT COUNT(*) FROM payments_view WHERE business_id = 'elixosense');
END $$;
