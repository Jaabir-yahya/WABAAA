-- Migration: Enhance event store with global ordering and metadata
-- Created: January 17, 2026
-- Description: Add event_store table with global sequence and timestamps

CREATE TABLE IF NOT EXISTS event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_sequence BIGSERIAL NOT NULL,

    -- Stream ordering (per aggregate)
    stream_id TEXT NOT NULL,
    stream_version BIGINT NOT NULL,

    -- Event data
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,

    -- Metadata (correlation, tenant, source)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(stream_id, stream_version)
);

CREATE INDEX IF NOT EXISTS idx_event_store_global ON event_store(global_sequence);
CREATE INDEX IF NOT EXISTS idx_event_store_stream ON event_store(stream_id);
CREATE INDEX IF NOT EXISTS idx_event_store_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_time ON event_store(occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_store_tenant ON event_store((metadata->>'tenant_id'));
