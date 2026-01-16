-- Migration: Create commerce_events table (Single Source of Truth)
-- Created: 2026-01-16
-- Description: Append-only event log for all commerce activities

CREATE TABLE IF NOT EXISTS commerce_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant isolation
    business_id TEXT NOT NULL,
    
    -- Event metadata
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Event source
    source_channel TEXT NOT NULL, -- 'whatsapp', 'mpesa', 'sms', 'web', 'manual'
    source_id TEXT, -- External ID (message_id, transaction_id, etc.)
    
    -- Actors
    customer_phone TEXT,
    customer_name TEXT,
    business_user_id UUID,
    
    -- Event payload
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadata
    idempotency_key TEXT UNIQUE,
    processed_at TIMESTAMPTZ,
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_commerce_events_business_id ON commerce_events(business_id);
CREATE INDEX idx_commerce_events_event_type ON commerce_events(event_type);
CREATE INDEX idx_commerce_events_customer_phone ON commerce_events(customer_phone);
CREATE INDEX idx_commerce_events_occurred_at ON commerce_events(occurred_at DESC);
CREATE INDEX idx_commerce_events_source ON commerce_events(source_channel, source_id);
CREATE INDEX idx_commerce_events_processing_status ON commerce_events(processing_status) WHERE processing_status != 'completed';

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commerce_events_updated_at
    BEFORE UPDATE ON commerce_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE commerce_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access events for their business
CREATE POLICY commerce_events_isolation ON commerce_events
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- Comments for documentation
COMMENT ON TABLE commerce_events IS 'Single source of truth for all commerce activities (append-only)';
COMMENT ON COLUMN commerce_events.event_type IS 'Primary event category: message, payment, order, inventory, etc.';
COMMENT ON COLUMN commerce_events.idempotency_key IS 'Ensures duplicate events are not processed twice (webhooks, retries)';
COMMENT ON COLUMN commerce_events.payload IS 'Full event data (flexible schema per event type)';
