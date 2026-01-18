-- Migration: Expenses tracking
-- Created: 2026-01-18
-- Description: Expense tracking for retail/service operations

-- ============================================================================
-- EXPENSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    category TEXT NOT NULL, -- cogs, rent, utilities, wages, transport, other
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- mpesa, cash, bank
    supplier_id UUID, -- FK added in suppliers migration
    employee_id UUID REFERENCES business_users(id),
    receipt_url TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(business_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id) WHERE employee_id IS NOT NULL;

CREATE TRIGGER expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_isolation ON expenses
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE expenses IS 'Expense tracking for daily operations';
