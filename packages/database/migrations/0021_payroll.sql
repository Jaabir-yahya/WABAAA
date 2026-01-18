-- Migration: Payroll and employee sales
-- Created: 2026-01-18
-- Description: Track employee sales and wage payments

-- ============================================================================
-- EMPLOYEE SALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    employee_id TEXT NOT NULL REFERENCES business_users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    sale_amount NUMERIC(12, 2) NOT NULL,
    commission_rate NUMERIC(5, 2),
    commission_amount NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sale_amount_positive CHECK (sale_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_employee_sales_business ON employee_sales(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_sales_employee ON employee_sales(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sales_order ON employee_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_employee_sales_created ON employee_sales(created_at DESC);

ALTER TABLE employee_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_sales_isolation ON employee_sales
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- WAGE PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS wage_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    employee_id TEXT NOT NULL REFERENCES business_users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_wage NUMERIC(12, 2),
    commission_total NUMERIC(12, 2),
    total_paid NUMERIC(12, 2) NOT NULL,
    payment_method TEXT,
    payment_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT total_paid_positive CHECK (total_paid >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wage_payments_business ON wage_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_wage_payments_employee ON wage_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_wage_payments_period ON wage_payments(period_start, period_end);

ALTER TABLE wage_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY wage_payments_isolation ON wage_payments
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE employee_sales IS 'Sales attributed to employees';
COMMENT ON TABLE wage_payments IS 'Wage payments for employees';
