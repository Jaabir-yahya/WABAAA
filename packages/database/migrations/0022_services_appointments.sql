-- Migration: Services and appointments
-- Created: 2026-01-18
-- Description: Service catalog and appointment bookings

-- ============================================================================
-- SERVICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    name_sw TEXT,
    category TEXT,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    duration_mins INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(business_id, category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(business_id, active) WHERE active = true;

CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_isolation ON services
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    order_id UUID REFERENCES orders(id),
    service_id UUID REFERENCES services(id),
    employee_id UUID REFERENCES business_users(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_mins INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_isolation ON appointments
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

COMMENT ON TABLE services IS 'Service catalog for appointments';
COMMENT ON TABLE appointments IS 'Appointment bookings for services';
