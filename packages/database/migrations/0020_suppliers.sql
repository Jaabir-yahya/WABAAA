-- Migration: Suppliers + supplier transactions
-- Created: 2026-01-18
-- Description: Supplier records and credit tracking

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    payment_terms TEXT,
    credit_limit NUMERIC(12, 2),
    outstanding_balance NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(business_id, name);

CREATE TRIGGER suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_isolation ON suppliers
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- SUPPLIER TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    transaction_type TEXT NOT NULL, -- purchase, payment
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_business ON supplier_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_type ON supplier_transactions(transaction_type);

ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_transactions_isolation ON supplier_transactions
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- FK: Expenses -> Suppliers
-- ============================================================================

ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

COMMENT ON TABLE suppliers IS 'Suppliers and credit terms';
COMMENT ON TABLE supplier_transactions IS 'Supplier purchases and payments';
