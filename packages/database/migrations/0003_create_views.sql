-- Migration: Create materialized views from commerce_events
-- Created: 2026-01-16
-- Description: Derived state from event log

-- ============================================================================
-- CUSTOMERS VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW customers_view AS
SELECT DISTINCT ON (business_id, customer_phone)
    business_id,
    customer_phone,
    customer_name,
    MIN(occurred_at) as first_seen_at,
    MAX(occurred_at) as last_activity_at,
    COUNT(*) FILTER (WHERE event_type = 'message.inbound') as message_count,
    COUNT(*) FILTER (WHERE event_type = 'order.created') as order_count,
    SUM((payload->>'amount')::numeric) FILTER (WHERE event_type = 'payment.received') as total_spent
FROM commerce_events
WHERE customer_phone IS NOT NULL
GROUP BY business_id, customer_phone, customer_name;

CREATE UNIQUE INDEX idx_customers_view_pk ON customers_view(business_id, customer_phone);
CREATE INDEX idx_customers_view_last_activity ON customers_view(last_activity_at DESC);

-- ============================================================================
-- ORDERS VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW orders_view AS
SELECT
    business_id,
    (payload->>'order_id')::text as order_id,
    customer_phone,
    customer_name,
    (payload->>'items')::jsonb as items,
    (payload->>'total_amount')::numeric as total_amount,
    (payload->>'status')::text as status,
    (payload->>'delivery_address')::text as delivery_address,
    MIN(occurred_at) as created_at,
    MAX(occurred_at) FILTER (WHERE event_type = 'order.fulfilled') as fulfilled_at,
    MAX(occurred_at) as updated_at
FROM commerce_events
WHERE event_type IN ('order.created', 'order.updated', 'order.fulfilled')
    AND payload->>'order_id' IS NOT NULL
GROUP BY business_id, (payload->>'order_id')::text, customer_phone, customer_name,
         (payload->>'items')::jsonb, (payload->>'total_amount')::numeric,
         (payload->>'status')::text, (payload->>'delivery_address')::text;

CREATE UNIQUE INDEX idx_orders_view_pk ON orders_view(business_id, order_id);
CREATE INDEX idx_orders_view_customer ON orders_view(customer_phone);
CREATE INDEX idx_orders_view_status ON orders_view(status);
CREATE INDEX idx_orders_view_created_at ON orders_view(created_at DESC);

-- ============================================================================
-- PAYMENTS VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW payments_view AS
SELECT
    business_id,
    (payload->>'transaction_id')::text as transaction_id,
    customer_phone,
    (payload->>'amount')::numeric as amount,
    (payload->>'receipt_number')::text as receipt_number,
    (payload->>'status')::text as status,
    (payload->>'linked_order_id')::text as linked_order_id,
    occurred_at as payment_date,
    source_channel,
    payload
FROM commerce_events
WHERE event_type = 'payment.received'
    AND payload->>'transaction_id' IS NOT NULL;

CREATE UNIQUE INDEX idx_payments_view_pk ON payments_view(business_id, transaction_id);
CREATE INDEX idx_payments_view_customer ON payments_view(customer_phone);
CREATE INDEX idx_payments_view_receipt ON payments_view(receipt_number);
CREATE INDEX idx_payments_view_date ON payments_view(payment_date DESC);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh all views
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customers_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY payments_view;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh views for a specific business (faster)
CREATE OR REPLACE FUNCTION refresh_views_for_business(p_business_id TEXT)
RETURNS void AS $$
BEGIN
    -- For now, refresh all views
    -- In production, could optimize to incremental refresh
    PERFORM refresh_all_views();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON MATERIALIZED VIEW customers_view IS 'Customer profiles derived from events';
COMMENT ON MATERIALIZED VIEW orders_view IS 'Orders derived from events';
COMMENT ON MATERIALIZED VIEW payments_view IS 'Payments derived from events';
COMMENT ON FUNCTION refresh_all_views IS 'Refresh all materialized views (call after bulk event ingestion)';

-- Note: In production, set up a cron job to refresh views periodically
-- Or use pg_cron extension or Supabase Edge Function scheduled task
