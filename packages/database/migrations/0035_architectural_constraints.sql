-- ============================================================================
-- Migration: Architectural guardrails
-- Created: 2026-01-19
-- Description: Adds analytics filtering view and documents status transitions
-- ============================================================================

-- Guardrail: Exclude pre-orders from analytics
CREATE OR REPLACE VIEW kcos_core.analytics_orders AS
SELECT *
FROM kcos_core.orders
WHERE status NOT IN ('needs_clarification', 'draft')
  AND total_amount > 0;

COMMENT ON VIEW kcos_core.analytics_orders IS
    'Orders eligible for analytics (excludes pre-orders and zero-amount intents)';

-- Use analytics_orders in daily_revenue
DROP MATERIALIZED VIEW IF EXISTS daily_revenue CASCADE;
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
    business_id,
    DATE(created_at) AS date,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
    SUM(outstanding_amount) AS outstanding
FROM kcos_core.analytics_orders
GROUP BY business_id, DATE(created_at);

CREATE UNIQUE INDEX idx_daily_revenue ON daily_revenue(business_id, date);

-- Guardrail: single-step transitions (documented)
COMMENT ON COLUMN kcos_core.orders.status IS
    'Valid transitions: pending→confirmed→preparing→ready→delivered (single steps only)';
