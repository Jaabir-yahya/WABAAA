-- Migration: Multi-location support
-- Created: 2026-01-18
-- Description: Business locations and location_id on key tables

-- ============================================================================
-- BUSINESS LOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_business ON business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_primary ON business_locations(business_id, is_primary);

CREATE TRIGGER business_locations_updated_at
    BEFORE UPDATE ON business_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_locations_isolation ON business_locations
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- ADD LOCATION_ID TO KEY TABLES
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id);

CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_location ON inventory_batches(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id) WHERE location_id IS NOT NULL;

COMMENT ON TABLE business_locations IS 'Business locations for multi-branch support';
