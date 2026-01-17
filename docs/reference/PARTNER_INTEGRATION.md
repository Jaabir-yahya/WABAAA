# Partner Integration (Phase 2 Ready)

This document defines the partner-ready API surfaces and data formats prepared in Phase 1.

## Partner Gateway Endpoint

**Function**: `supabase/functions/partner-gateway`

### Request

```json
{
  "business_id": "elixosense",
  "action": "business_snapshot"
}
```

### Response (business_snapshot)

```json
{
  "revenue_last_90_days": 120000,
  "average_order_value": 540,
  "customer_count": 120,
  "repeat_customer_rate": 0.32,
  "payment_velocity_days": 2.8,
  "working_capital": 45000,
  "format": "standard_financial_snapshot_v1",
  "generated_at": "2026-01-16T12:00:00Z",
  "validity_days": 7
}
```

### Request (customer_profile)

```json
{
  "business_id": "elixosense",
  "action": "customer_profile",
  "customer_phone": "+254712345678"
}
```

### Response (customer_profile)

```json
{
  "behavioral_data": {
    "months_active": 5,
    "total_transactions": 12,
    "total_volume": 21000,
    "average_transaction_size": 1750,
    "payment_punctuality": 0.84,
    "credit_utilization_trend": []
  },
  "pii_available": false,
  "consent_required": true,
  "export_formats": ["json", "csv", "iso20022"],
  "compliance_level": "aggregated_only"
}
```

## Consent Strategy

- Consent records are stored in `consent_records`.
- Phase 1 only stores consent metadata (no PII sharing).
- Partners must request consent before PII access in Phase 2.

## Phase 2 Stubs

**Function**: `supabase/functions/phase2-stubs`

Supported actions:
- `apply_loan`
- `insurance_quote`
- `settlement`

Each returns a `phase_2_feature` response with requirements and partner list.

## Data Schema References

Key tables prepared for partner handoff:
- `customer_financial_profiles`
- `business_financial_metrics`
- `financial_audit_trail`
- `consent_records`

