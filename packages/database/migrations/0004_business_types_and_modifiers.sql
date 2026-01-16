-- Migration: Add business types and restaurant modifiers/menu items
-- Created: January 16, 2026
-- Description: Support multi-business-type templates and restaurant features

-- ============================================================================
-- BUSINESS TYPE EXTENSION
-- ============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'mini_supermarket';

CREATE INDEX IF NOT EXISTS idx_businesses_type ON businesses(business_type);

-- ============================================================================
-- ORDER MODIFIERS (Restaurant add/remove/substitute)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  modifier_type TEXT NOT NULL,
  modifier_value TEXT NOT NULL,
  price_adjustment NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_modifiers_order ON order_modifiers(order_id);

ALTER TABLE order_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_modifiers_isolation ON order_modifiers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.id = order_modifiers.order_id
        AND orders.business_id = current_setting('app.current_business_id', true)::text
    )
  );

-- ============================================================================
-- MENU ITEMS (Restaurant menu catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  category TEXT,
  name TEXT NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  base_price NUMERIC(12, 2) NOT NULL,
  prep_time_minutes INTEGER DEFAULT 15,
  available BOOLEAN DEFAULT TRUE,
  modifiers_allowed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_business ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(business_id, available);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_items_isolation ON menu_items
  FOR ALL
  USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN businesses.business_type IS 'Business template key (mini_supermarket, restaurant, etc.)';
COMMENT ON TABLE order_modifiers IS 'Per-item modifiers (extra cheese, no onions)';
COMMENT ON TABLE menu_items IS 'Restaurant menu catalog with aliases and modifiers';
