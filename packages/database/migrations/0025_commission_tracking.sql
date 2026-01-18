-- Migration: Commission tracking on orders
-- Created: 2026-01-18
-- Description: Add employee attribution and commission fields to orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES business_users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_orders_employee ON orders(employee_id) WHERE employee_id IS NOT NULL;

CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NOT NULL AND NEW.commission_rate IS NOT NULL THEN
        NEW.commission_amount := NEW.total_amount * (NEW.commission_rate / 100);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_calculate_commission ON orders;

CREATE TRIGGER orders_calculate_commission
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();
