-- Migration: Create businesses table (Tenants)
-- Created: 2026-01-16
-- Description: Multi-tenant business/merchant accounts

CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY, -- Human-readable: 'elixosense', 'kamau-grocery', etc.
    
    -- Basic info
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    owner_email TEXT,
    
    -- Contact channels
    whatsapp_number TEXT,
    sms_number TEXT,
    
    -- Payment config
    mpesa_shortcode TEXT,
    mpesa_paybill TEXT,
    mpesa_till_number TEXT,
    
    -- Localization
    language_default TEXT DEFAULT 'sw', -- 'sw' (Swahili), 'en' (English)
    timezone TEXT DEFAULT 'Africa/Nairobi',
    currency TEXT DEFAULT 'KES',
    
    -- Business config
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'inactive'
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    subscription_expires_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_businesses_status ON businesses(status) WHERE status = 'active';
CREATE INDEX idx_businesses_owner_phone ON businesses(owner_phone);

-- Updated timestamp trigger
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own business
CREATE POLICY businesses_isolation ON businesses
    FOR ALL
    USING (id = current_setting('app.current_business_id', true)::text);

-- Comments
COMMENT ON TABLE businesses IS 'Multi-tenant merchant accounts';
COMMENT ON COLUMN businesses.id IS 'Human-readable business identifier (slug)';
COMMENT ON COLUMN businesses.config IS 'Business-specific configuration (parser rules, branding, etc.)';
