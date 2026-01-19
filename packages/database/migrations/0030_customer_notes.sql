-- Migration: Customer notes
-- Created: 2026-01-19
-- Description: Store customer notes and preferences for personalization

CREATE TABLE IF NOT EXISTS kcos_core.customer_notes (
    business_id TEXT NOT NULL REFERENCES kcos_system.businesses(id),
    customer_phone TEXT NOT NULL,
    notes TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES kcos_system.business_users(id),
    PRIMARY KEY (business_id, customer_phone)
);

CREATE INDEX idx_customer_notes_business ON kcos_core.customer_notes(business_id);

ALTER TABLE kcos_core.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_notes_isolation ON kcos_core.customer_notes
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE kcos_core.customer_notes IS 'Customer notes and preferences for personalized service';
