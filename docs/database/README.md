# Database Documentation

**PostgreSQL schema for KCOS**

---

## Documents

| Document | Purpose |
|----------|---------|
| [[SCHEMA]] | Complete database schema |

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `businesses` | Tenant/merchant records |
| `commerce_events` | Event sourcing lake (source of truth) |
| `orders` | Order projections |
| `payments` | Payment records |
| `actors` | Customer/participant records |
| `menu_items` | Product catalog |
| `workflow_definitions` | Stored workflows |
| `workflow_instances` | Running workflow state |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           commerce_events                   │
│        (immutable event lake)               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────┬───────┴──────┬────────────┐
│ orders  │  payments    │   actors   │
│         │              │            │
│ (projections - derived from events) │
└─────────┴──────────────┴────────────┘
```

---

## Multi-Tenant Isolation

All tables include `business_id` with **Row Level Security (RLS)**:

```sql
CREATE POLICY tenant_isolation ON orders
    USING (business_id = current_setting('app.current_business_id', true));
```

---

## Related Diagrams

- [[../diagrams/05-data-architecture|Data Architecture Diagram]]
- [[../diagrams/07-multi-tenant|Multi-Tenant Model]]

---

## Back to Main Docs

- [[../HOME|← Home]]

---

#kcos #database #postgresql #schema
