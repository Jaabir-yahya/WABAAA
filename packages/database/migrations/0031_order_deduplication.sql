-- Migration: Order deduplication
-- Created: 2026-01-19
-- Description: Track WhatsApp message IDs to prevent duplicate orders

ALTER TABLE kcos_core.orders ADD COLUMN IF NOT EXISTS
    source_message_id TEXT;

CREATE UNIQUE INDEX idx_orders_whatsapp_dedup
    ON kcos_core.orders(business_id, source_message_id)
    WHERE source_message_id IS NOT NULL;

COMMENT ON COLUMN kcos_core.orders.source_message_id IS
    'WhatsApp message ID for deduplication (prevents double orders on webhook retry)';
