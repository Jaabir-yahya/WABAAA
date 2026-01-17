# Security Audit Foundation

This document describes the Phase 1 security foundations for future partner audits.

## Security Audit Log

Table: `security_audit_log`

Fields:
- `business_id`
- `event_type`
- `severity`
- `actor`
- `action`
- `resource`
- `ip_address`
- `user_agent`
- `metadata`
- `created_at`

## Logging Utility

**File**: `supabase/functions/_shared/security-audit.ts`

Capabilities:
- Log security events to `security_audit_log`
- Rate limit enforcement per IP/business/action
- Emits `rate_limit_exceeded` events

## Rate Limiting Strategy

Default limits applied:
- QR generation: 30/min
- QR scan routing: 60/min
- Customer profile update: 10/min
- Business metrics update: 5/min
- Payment link generation: 10/min
- Order creation: 20/min
- Manual payment recording: 20/min
- Order correction: 10/min

