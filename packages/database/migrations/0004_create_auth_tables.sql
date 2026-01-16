-- Migration: Create auth-related tables
-- Created: 2026-01-16
-- Description: User accounts and permissions (integrates with Supabase Auth)

-- ============================================================================
-- BUSINESS USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Supabase Auth
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Business association
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- User info
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    
    -- Role & permissions
    role TEXT NOT NULL DEFAULT 'owner', -- 'owner', 'admin', 'staff'
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_business_users_auth ON business_users(auth_user_id);
CREATE INDEX idx_business_users_business ON business_users(business_id);
CREATE INDEX idx_business_users_email ON business_users(email);

-- Updated timestamp trigger
CREATE TRIGGER update_business_users_updated_at
    BEFORE UPDATE ON business_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own business's users
CREATE POLICY business_users_isolation ON business_users
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- API KEYS (for integrations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Business association
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Key details
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- bcrypt hash of the actual key
    key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., 'kco_live')
    
    -- Permissions
    scopes JSONB DEFAULT '["read", "write"]'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES business_users(id)
);

-- Indexes
CREATE INDEX idx_api_keys_business ON api_keys(business_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_isolation ON api_keys
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- WEBHOOK CONFIGURATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Business association
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Webhook details
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL, -- For HMAC signature verification
    
    -- Events to subscribe to
    event_types TEXT[] NOT NULL DEFAULT ARRAY['*'], -- ['order.created', 'payment.received', etc.]
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_configs_business ON webhook_configs(business_id);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(is_active) WHERE is_active = true;

-- Updated timestamp trigger
CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_configs_isolation ON webhook_configs
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- Comments
COMMENT ON TABLE business_users IS 'User accounts associated with businesses';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access (e.g., e-commerce integration)';
COMMENT ON TABLE webhook_configs IS 'Webhook endpoints for external integrations';
