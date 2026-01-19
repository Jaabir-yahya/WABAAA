-- Migration: Schema organization
-- Created: 2026-01-19
-- Description: Organize core and system tables into dedicated schemas

-- ============================================================================
-- CREATE SCHEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS kcos_core;
CREATE SCHEMA IF NOT EXISTS kcos_system;

COMMENT ON SCHEMA kcos_core IS 'Core order/payment tables for operational dashboard';
COMMENT ON SCHEMA kcos_system IS 'System infrastructure: events, businesses, auth';

-- ============================================================================
-- MOVE CORE TABLES (Dogfooding essentials)
-- ============================================================================

ALTER TABLE IF EXISTS orders SET SCHEMA kcos_core;
ALTER TABLE IF EXISTS payments SET SCHEMA kcos_core;

-- ============================================================================
-- MOVE SYSTEM TABLES
-- ============================================================================

ALTER TABLE IF EXISTS commerce_events SET SCHEMA kcos_system;
ALTER TABLE IF EXISTS businesses SET SCHEMA kcos_system;
ALTER TABLE IF EXISTS business_users SET SCHEMA kcos_system;
ALTER TABLE IF EXISTS api_keys SET SCHEMA kcos_system;
ALTER TABLE IF EXISTS idempotency_keys SET SCHEMA kcos_system;

-- ============================================================================
-- BACKWARD COMPATIBILITY VIEWS (Optional - for gradual migration)
-- ============================================================================

CREATE OR REPLACE VIEW public.orders AS
SELECT * FROM kcos_core.orders;

CREATE OR REPLACE VIEW public.payments AS
SELECT * FROM kcos_core.payments;

CREATE OR REPLACE VIEW public.commerce_events AS
SELECT * FROM kcos_system.commerce_events;

CREATE OR REPLACE VIEW public.businesses AS
SELECT * FROM kcos_system.businesses;

-- ============================================================================
-- SET DEFAULT SEARCH PATH
-- ============================================================================

ALTER DATABASE postgres SET search_path TO kcos_core, kcos_system, public;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE kcos_core.orders IS 'Core orders table (dogfooding)';
COMMENT ON TABLE kcos_core.payments IS 'Core payments table (dogfooding)';
COMMENT ON TABLE kcos_system.commerce_events IS 'Immutable event log';
COMMENT ON TABLE kcos_system.businesses IS 'Business/tenant definitions';
