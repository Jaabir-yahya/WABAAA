-- Migration: Remittance transfers and agent float
-- Created: 2026-01-18
-- Description: Remittance tracking for agent businesses

-- ============================================================================
-- REMITTANCE TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS remittance_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    employee_id TEXT REFERENCES business_users(id),
    transfer_type TEXT NOT NULL, -- send, withdraw, deposit
    amount NUMERIC(12, 2) NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    sender_phone TEXT,
    recipient_phone TEXT,
    recipient_name TEXT,
    transaction_code TEXT UNIQUE,
    status TEXT NOT NULL,
    kyc_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remittance_business ON remittance_transfers(business_id);
CREATE INDEX IF NOT EXISTS idx_remittance_employee ON remittance_transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_remittance_status ON remittance_transfers(status);
CREATE INDEX IF NOT EXISTS idx_remittance_created ON remittance_transfers(created_at DESC);

ALTER TABLE remittance_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY remittance_transfers_isolation ON remittance_transfers
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- AGENT FLOAT
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_float (
    business_id TEXT PRIMARY KEY REFERENCES businesses(id),
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    committed_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_float ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_float_isolation ON agent_float
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE remittance_transfers IS 'Remittance transfers for agent businesses';
COMMENT ON TABLE agent_float IS 'Agent float balances';
