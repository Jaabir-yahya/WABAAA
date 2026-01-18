-- Migration: Cash reconciliation
-- Created: 2026-01-19
-- Description: Daily cash float tracking

CREATE TABLE IF NOT EXISTS cash_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    location_id UUID REFERENCES business_locations(id),

    opening_date DATE NOT NULL,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,

    expected_cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expected_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expected_closing NUMERIC(12, 2) GENERATED ALWAYS AS
        (opening_balance + expected_cash_sales - expected_expenses) STORED,

    actual_closing NUMERIC(12, 2),
    variance NUMERIC(12, 2) GENERATED ALWAYS AS
        (actual_closing - expected_closing) STORED,

    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES business_users(id),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (business_id, opening_date, location_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_recon_business_date
    ON cash_reconciliations(business_id, opening_date DESC);

ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_recon_isolation ON cash_reconciliations
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE cash_reconciliations IS 'Daily cash reconciliation records';
