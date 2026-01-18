-- Migration: Analytics views
-- Created: 2026-01-18
-- Description: Materialized views for reporting

-- ============================================================================
-- DAILY REVENUE (MATERIALIZED VIEW)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_revenue AS
SELECT
    business_id,
    DATE(created_at) AS date,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
    SUM(outstanding_amount) AS outstanding
FROM orders
GROUP BY business_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_revenue ON daily_revenue(business_id, date);

-- ============================================================================
-- PROFIT & LOSS (VIEW)
-- ============================================================================

CREATE OR REPLACE VIEW profit_loss_current_month AS
SELECT
    b.id AS business_id,
    b.name AS business_name,
    COALESCE(r.revenue, 0) AS revenue,
    COALESCE(e.expenses, 0) AS expenses,
    COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0) AS profit,
    r.orders,
    e.expense_count
FROM businesses b
LEFT JOIN (
    SELECT
        business_id,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS revenue,
        COUNT(*) AS orders
    FROM orders
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY business_id
) r ON r.business_id = b.id
LEFT JOIN (
    SELECT
        business_id,
        SUM(amount) AS expenses,
        COUNT(*) AS expense_count
    FROM expenses
    WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY business_id
) e ON e.business_id = b.id;

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_analytics() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;
END;
$$ LANGUAGE plpgsql;
