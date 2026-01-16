-- Migration: Add QR tracking fields for orders
-- Created: January 16, 2026
-- Description: Track QR order origin and metadata

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'whatsapp';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS qr_metadata JSONB;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS qr_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_qr_reference ON orders(qr_reference);

COMMENT ON COLUMN orders.source IS 'Order origin: whatsapp, qr_code, manual, sms';
COMMENT ON COLUMN orders.qr_metadata IS 'Metadata from QR scan and payment';
COMMENT ON COLUMN orders.qr_reference IS 'Encoded KCOS reference for QR orders';
