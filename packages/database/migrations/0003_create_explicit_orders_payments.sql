-- Migration: Add explicit orders and payments tables
-- Created: January 16, 2026
-- Description: Hybrid model (event-sourced + explicit tables for spec compliance)

-- ============================================================================
-- ORDERS TABLE (Explicit order records with outstanding_amount tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    
    -- Amounts (SPEC REQUIREMENT)
    total_amount NUMERIC(12, 2) NOT NULL,
    outstanding_amount NUMERIC(12, 2) NOT NULL,  -- Tracks unpaid balance
    
    -- Credit terms (SPEC REQUIREMENT)
    is_credit BOOLEAN DEFAULT FALSE,
    payment_terms TEXT,  -- "7 days", "COD", "NET 30", etc.
    
    -- Order details
    items JSONB DEFAULT '[]'::jsonb,  -- [{product, qty, unit, price}]
    delivery_address TEXT,
    delivery_instructions TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',  -- 'pending', 'paid', 'partial', 'fulfilled'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints (SPEC REQUIREMENT)
    CONSTRAINT outstanding_positive CHECK (outstanding_amount >= 0),
    CONSTRAINT total_positive CHECK (total_amount > 0)
);

-- Indexes for performance
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_customer ON orders(customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_outstanding ON orders(outstanding_amount) WHERE outstanding_amount > 0;

-- Auto-set outstanding_amount = total_amount on insert (SPEC REQUIREMENT)
CREATE OR REPLACE FUNCTION set_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outstanding_amount IS NULL THEN
        NEW.outstanding_amount = NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_outstanding
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_outstanding_amount();

-- Updated timestamp trigger
CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PAYMENTS TABLE (Explicit payment records with applied_amount tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),
    order_id UUID REFERENCES orders(id),  -- Can be NULL (unlinked payment)
    customer_phone TEXT NOT NULL,
    
    -- Amounts (SPEC REQUIREMENT)
    amount NUMERIC(12, 2) NOT NULL,
    applied_amount NUMERIC(12, 2) NOT NULL,  -- Amount applied to order
    
    -- Payment details
    method TEXT NOT NULL,  -- 'mpesa', 'cash', 'bank'
    mpesa_receipt TEXT,  -- M-Pesa receipt number
    mpesa_transaction_id TEXT,  -- M-Pesa transaction ID
    
    -- Status
    status TEXT DEFAULT 'confirmed',  -- 'confirmed', 'pending', 'failed'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints (SPEC REQUIREMENT)
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT applied_positive CHECK (applied_amount >= 0),
    CONSTRAINT mpesa_receipt_unique UNIQUE (business_id, mpesa_receipt)
);

-- Indexes for performance
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_phone);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);

-- ============================================================================
-- LOCKED EVENT TYPES (Enforce 6 types only - SPEC REQUIREMENT)
-- ============================================================================
ALTER TABLE commerce_events 
    DROP CONSTRAINT IF EXISTS event_type_locked;

ALTER TABLE commerce_events
    ADD CONSTRAINT event_type_locked CHECK (
        event_type IN (
            'whatsapp_message_in',
            'whatsapp_message_out',
            'mpesa_payment_callback',
            'manual_correction',
            'customer_proof',
            'merchant_note'
        )
    );

-- ============================================================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- ============================================================================

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_isolation ON orders
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_isolation ON payments
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to apply payment to order (reduces outstanding_amount)
CREATE OR REPLACE FUNCTION apply_payment_to_order(
    p_order_id UUID,
    p_payment_amount NUMERIC
)
RETURNS TABLE(
    success BOOLEAN,
    new_outstanding_amount NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_outstanding NUMERIC;
    v_total NUMERIC;
BEGIN
    -- Get current outstanding amount
    SELECT outstanding_amount, total_amount INTO v_outstanding, v_total
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;  -- Lock row
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::NUMERIC, 'Order not found';
        RETURN;
    END IF;
    
    -- Apply payment
    UPDATE orders
    SET 
        outstanding_amount = GREATEST(outstanding_amount - p_payment_amount, 0),
        status = CASE 
            WHEN outstanding_amount - p_payment_amount <= 0 THEN 'paid'
            WHEN outstanding_amount - p_payment_amount < total_amount THEN 'partial'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Get new outstanding amount
    SELECT outstanding_amount INTO v_outstanding
    FROM orders
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT TRUE, v_outstanding, 'Payment applied successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE orders IS 'Explicit order records with outstanding_amount tracking (SPEC: hybrid model)';
COMMENT ON TABLE payments IS 'Explicit payment records with applied_amount tracking (SPEC: hybrid model)';
COMMENT ON COLUMN orders.outstanding_amount IS 'Unpaid balance; reduced by payments (SPEC requirement)';
COMMENT ON COLUMN orders.is_credit IS 'Credit sale flag (SPEC requirement for Fix #1)';
COMMENT ON COLUMN payments.applied_amount IS 'Amount applied to order (SPEC: may differ from amount if overpayment)';
COMMENT ON CONSTRAINT event_type_locked ON commerce_events IS 'Enforces 6 locked event types only (SPEC compliance)';
COMMENT ON FUNCTION apply_payment_to_order IS 'Helper to apply payment and reduce outstanding_amount atomically';

-- ============================================================================
-- VERIFICATION QUERIES (For manual testing)
-- ============================================================================

-- Test 1: Verify outstanding_amount defaults correctly
-- INSERT INTO orders (business_id, customer_phone, total_amount) 
-- VALUES ('test', '254712345678', 1500.00);
-- SELECT id, total_amount, outstanding_amount FROM orders WHERE business_id = 'test';
-- EXPECT: outstanding_amount = 1500.00

-- Test 2: Verify payment application
-- SELECT * FROM apply_payment_to_order('[order-id]', 500.00);
-- SELECT outstanding_amount, status FROM orders WHERE id = '[order-id]';
-- EXPECT: outstanding_amount = 1000.00, status = 'partial'

-- Test 3: Verify 7th event type is rejected
-- INSERT INTO commerce_events (business_id, event_type, source_channel, payload)
-- VALUES ('test', 'invalid_type', 'test', '{}');
-- EXPECT: ERROR violates check constraint "event_type_locked"

-- Test 4: Verify duplicate M-Pesa receipt is rejected
-- INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
-- VALUES ('test', '254712345678', 100, 100, 'mpesa', 'TEST123');
-- INSERT INTO payments (business_id, customer_phone, amount, applied_amount, method, mpesa_receipt)
-- VALUES ('test', '254712345678', 100, 100, 'mpesa', 'TEST123');
-- EXPECT: ERROR duplicate key value violates unique constraint
