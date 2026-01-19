-- Migration: RLS security fix
-- Created: 2026-01-19
-- Description: Enforce business context for RLS using session variables

-- ============================================================================
-- SESSION CONTEXT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_business_context(p_business_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.current_business_id', p_business_id, false);
  RAISE NOTICE 'Business context set to: %', p_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_business_context()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_business_id', true)::text;
$$;

CREATE OR REPLACE FUNCTION clear_business_context()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.current_business_id', '', false);
END;
$$;

-- ============================================================================
-- DEBUG VIEW FOR RLS CONTEXT
-- ============================================================================

CREATE OR REPLACE VIEW kcos_system.rls_debug AS
SELECT
  current_setting('app.current_business_id', true) as current_business_context,
  current_user as postgres_user,
  inet_client_addr() as client_ip,
  application_name
FROM pg_stat_activity
WHERE pid = pg_backend_pid();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION set_business_context IS
  'CRITICAL: Must be called before queries when using SERVICE_ROLE_KEY to enforce RLS';
COMMENT ON FUNCTION get_business_context IS
  'Returns current business context for debugging';
COMMENT ON VIEW kcos_system.rls_debug IS
  'Debug view to verify RLS context is set correctly';
