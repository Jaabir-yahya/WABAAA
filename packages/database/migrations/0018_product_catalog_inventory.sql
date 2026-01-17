-- Migration: Product catalog + batch inventory foundation
-- Created: 2026-01-17
-- Description: Core product catalog, batch/expiry inventory, stock movements

-- ============================================================================
-- PRODUCTS (Universal catalog for retail/health)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    name_sw TEXT,
    category TEXT,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    requires_prescription BOOLEAN DEFAULT FALSE,
    is_health_product BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    attributes JSONB DEFAULT '{}'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(business_id, category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(business_id, active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin (to_tsvector('simple', name));

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_isolation ON products
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- INVENTORY BATCHES (Batch + expiry tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id TEXT,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, product_id, batch_number, store_id)
);

CREATE INDEX IF NOT EXISTS idx_batches_business ON inventory_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_store ON inventory_batches(business_id, store_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON inventory_batches(expiry_date);

CREATE TRIGGER inventory_batches_updated_at
    BEFORE UPDATE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_batches_isolation ON inventory_batches
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- STOCK MOVEMENTS (Audit trail for inventory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID REFERENCES inventory_batches(id),
    store_id TEXT,
    movement_type TEXT NOT NULL, -- receive, reserve, release, adjust, count, return
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    actor_id TEXT,
    source_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movements_isolation ON stock_movements
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE products IS 'Universal product catalog (retail + health)';
COMMENT ON TABLE inventory_batches IS 'Inventory batches with expiry tracking';
COMMENT ON TABLE stock_movements IS 'Inventory movement audit trail';
