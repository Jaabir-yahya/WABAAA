-- Migration: Idempotency keys table
-- Created: January 17, 2026
-- Description: Prevent duplicate execution of actions

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response JSONB NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE(tenant_id, idempotency_key, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_tenant_key
    ON idempotency_keys(tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
    ON idempotency_keys(expires_at);
