-- Migration: Dashboard views
-- Created: 2026-01-19
-- Description: Unified dashboard view and customer history function

CREATE OR REPLACE VIEW kcos_core.dashboard_live AS
SELECT
    o.id as order_id,
    o.customer_phone,
    o.customer_name,
    o.items,
    o.total_amount,
    o.outstanding_amount,
    o.status,
    o.created_at,
    o.updated_at,
    o.source_message_id,
    cn.notes as customer_notes,
    cn.preferences as customer_preferences,
    o.outstanding_amount > 0 as has_debt,
    EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 as hours_old,
    o.total_amount - o.outstanding_amount as amount_paid
FROM kcos_core.orders o
LEFT JOIN kcos_core.customer_notes cn
    ON cn.customer_phone = o.customer_phone
    AND cn.business_id = o.business_id
WHERE o.created_at >= CURRENT_DATE
ORDER BY o.created_at DESC;

CREATE OR REPLACE FUNCTION kcos_core.get_customer_orders(
    p_business_id TEXT,
    p_customer_phone TEXT,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    order_id UUID,
    created_at TIMESTAMPTZ,
    total_amount NUMERIC,
    outstanding_amount NUMERIC,
    status TEXT,
    items JSONB
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.created_at,
        o.total_amount,
        o.outstanding_amount,
        o.status,
        o.items
    FROM kcos_core.orders o
    WHERE o.business_id = p_business_id
        AND o.customer_phone = p_customer_phone
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON VIEW kcos_core.dashboard_live IS
    'Unified dashboard view: supports customer-first, order-first, and kanban layouts';
COMMENT ON FUNCTION kcos_core.get_customer_orders IS
    'Fast customer order history (optimized for dashboard sidebar)';
