-- Migration: Financial foundation schema (Phase 1)
-- Created: 2026-01-16
-- Description: Partner-ready financial data schema + audit trail

-- ============================================================================
-- CUSTOMER FINANCIAL PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_financial_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_phone TEXT NOT NULL,
    total_spent DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    avg_order_value DECIMAL(12,2),
    payment_velocity_days DECIMAL(5,2),
    payment_consistency_score DECIMAL(3,2),
    credit_utilization DECIMAL(5,2),
    segment TEXT,
    first_order_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_business ON customer_financial_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_financial_profiles(customer_phone);

CREATE TRIGGER update_customer_profiles_updated_at
    BEFORE UPDATE ON customer_financial_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customer_financial_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_financial_profiles_isolation ON customer_financial_profiles
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- BUSINESS FINANCIAL METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_financial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) UNIQUE,
    current_assets DECIMAL(12,2) DEFAULT 0,
    current_liabilities DECIMAL(12,2) DEFAULT 0,
    working_capital DECIMAL(12,2) GENERATED ALWAYS AS
        (current_assets - current_liabilities) STORED,
    cash_conversion_cycle_days INTEGER,
    gross_margin_percent DECIMAL(5,2),
    inventory_turnover_ratio DECIMAL(5,2),
    revenue_last_30_days DECIMAL(12,2),
    revenue_last_90_days DECIMAL(12,2),
    avg_daily_revenue DECIMAL(12,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_metrics_business ON business_financial_metrics(business_id);

CREATE TRIGGER update_business_financial_metrics_updated_at
    BEFORE UPDATE ON business_financial_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE business_financial_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_financial_metrics_isolation ON business_financial_metrics
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- FINANCIAL AUDIT TRAIL
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_audit_trail (
    id BIGSERIAL PRIMARY KEY,
    business_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by TEXT DEFAULT 'system',
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_business ON financial_audit_trail(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_table ON financial_audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_financial_audit_changed_at ON financial_audit_trail(changed_at DESC);

ALTER TABLE financial_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_audit_trail_isolation ON financial_audit_trail
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- CONSENT RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_phone TEXT,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    version TEXT DEFAULT '1.0',
    purpose TEXT,
    expiry_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_business ON consent_records(business_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_phone ON consent_records(customer_phone);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY consent_records_isolation ON consent_records
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- FINANCIAL AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO financial_audit_trail (business_id, table_name, record_id, action, old_values)
        VALUES (OLD.business_id, TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO financial_audit_trail (business_id, table_name, record_id, action, old_values, new_values)
        VALUES (NEW.business_id, TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO financial_audit_trail (business_id, table_name, record_id, action, new_values)
        VALUES (NEW.business_id, TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_orders_changes
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

CREATE TRIGGER audit_payments_changes
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

CREATE TRIGGER audit_customer_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON customer_financial_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

