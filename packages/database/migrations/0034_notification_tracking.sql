-- ============================================================================
-- Migration: Notification tracking for idempotency
-- Created: 2026-01-19
-- Description: Tracks outbound notifications to avoid duplicates
-- ============================================================================

CREATE TABLE IF NOT EXISTS kcos_core.order_notifications (
    order_id UUID NOT NULL REFERENCES kcos_core.orders(id),
    status TEXT NOT NULL,
    channel TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_id TEXT,
    business_id TEXT NOT NULL REFERENCES kcos_system.businesses(id),
    PRIMARY KEY (order_id, status, channel)
);

CREATE INDEX idx_order_notifications_order ON kcos_core.order_notifications(order_id);
CREATE INDEX idx_order_notifications_sent_at ON kcos_core.order_notifications(sent_at DESC);

ALTER TABLE kcos_core.order_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_notifications_isolation ON kcos_core.order_notifications
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE kcos_core.order_notifications IS
    'Tracks sent notifications to prevent duplicates (idempotency)';
