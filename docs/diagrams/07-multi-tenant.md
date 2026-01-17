# KCOS Multi-Tenant Architecture

## Tenant Isolation Model

```mermaid
flowchart TB
    subgraph Tenants["🏢 Tenant Businesses"]
        T1["ElixoSense\n(elixosense)"]
        T2["Mama Mboga\n(mama-mboga)"]
        T3["Quick Mart\n(quick-mart)"]
    end

    subgraph API["🔐 API Layer"]
        AUTH["Auth Context\nJWT with business_id"]
    end

    subgraph RLS["🛡️ Row Level Security"]
        POLICY["current_setting('app.current_business_id')"]
    end

    subgraph Data["💾 Shared Tables"]
        ORD[(orders)]
        PAY[(payments)]
        EV[(commerce_events)]
    end

    T1 & T2 & T3 --> AUTH
    AUTH -->|"sets business_id"| RLS
    RLS -->|"filters"| Data
```

## RLS Policy Implementation

```mermaid
sequenceDiagram
    participant Client as Merchant PWA
    participant Edge as Edge Function
    participant Auth as Auth Context
    participant DB as PostgreSQL
    participant RLS as RLS Policy

    Client->>Edge: Request with JWT
    Edge->>Auth: Validate JWT
    Auth-->>Edge: { business_id: 'elixosense' }
    
    Edge->>DB: SET app.current_business_id = 'elixosense'
    Edge->>DB: SELECT * FROM orders
    
    DB->>RLS: Check policy
    RLS->>RLS: WHERE business_id = 'elixosense'
    RLS-->>DB: Filtered results
    
    DB-->>Edge: Only elixosense orders
    Edge-->>Client: JSON response
```

## Database Policies

```sql
-- All tables have business_id column
ALTER TABLE orders ADD COLUMN business_id TEXT NOT NULL;
ALTER TABLE payments ADD COLUMN business_id TEXT NOT NULL;
ALTER TABLE commerce_events ADD COLUMN business_id TEXT NOT NULL;
ALTER TABLE workflow_definitions ADD COLUMN tenant_id TEXT NOT NULL;

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

-- Isolation policies
CREATE POLICY tenant_isolation_orders ON orders
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true));

CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true));

CREATE POLICY tenant_isolation_events ON commerce_events
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true));

CREATE POLICY tenant_isolation_workflows ON workflow_definitions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));
```

## Tenant Context in Actions

```mermaid
classDiagram
    class ActionContext {
        +string tenantId
        +string workflowId
        +string correlationId
        +Record variables
        +string idempotencyKey
        +string stepId
        +Date workflowStartedAt
    }

    class Action {
        +execute(input, context)
    }

    class Database {
        +query(sql, params)
    }

    Action --> ActionContext : receives
    Action --> Database : queries with tenantId

    note for ActionContext "tenantId is automatically\nset from workflow context\nand used for all DB operations"
```

### Action Using Tenant Context

```typescript
async execute(input: ActionInput, context: ActionContext): Promise<ActionOutput> {
  const supabase = getSupabaseClient();
  
  // All queries automatically scoped by context.tenantId
  const { data, error } = await supabase
    .from('orders')
    .insert({
      business_id: context.tenantId,  // Always use context
      customer_phone: input.customerPhone,
      total_amount: input.totalAmount,
    })
    .select()
    .single();

  // tenantId also used for idempotency
  return withIdempotency(
    context.tenantId,
    context.idempotencyKey,
    'order.create',
    input,
    async () => { /* ... */ }
  );
}
```

## Per-Tenant Configuration

```mermaid
flowchart TB
    subgraph Business["Business Table"]
        BIZ["businesses\n─────────────\nid: 'elixosense'\nname: 'ElixoSense'\nbusiness_type: 'mini_supermarket'\nconfig: {...}"]
    end

    subgraph Config["Tenant Config (JSONB)"]
        CFG["{\n  parserConfig: {...},\n  whatsappPhoneId: 'xxx',\n  mpesaShortcode: '174379',\n  smsEnabled: true,\n  webhooks: {\n    onOrder: 'https://...',\n    onPayment: 'https://...'\n  }\n}"]
    end

    subgraph Workflow["Workflow Access"]
        WF["{{ tenant.config.mpesaShortcode }}\n{{ tenant.config.webhooks.onOrder }}"]
    end

    Business --> Config
    Config --> Workflow
```

## Tenant Resolution Flow

```mermaid
flowchart TB
    subgraph Incoming["Incoming Request"]
        WA["WhatsApp Webhook"]
        MP["M-Pesa Callback"]
        HTTP["HTTP API"]
    end

    subgraph Resolution["Tenant Resolution"]
        R1["By WhatsApp\nPhone Number ID"]
        R2["By M-Pesa\nShortcode"]
        R3["By JWT\nbusiness_id claim"]
    end

    subgraph Lookup["Tenant Lookup"]
        LK["SELECT * FROM businesses\nWHERE config->>'whatsappPhoneId' = ?"]
    end

    subgraph Context["Set Context"]
        CTX["SET app.current_business_id = 'elixosense'"]
    end

    WA --> R1
    MP --> R2
    HTTP --> R3

    R1 & R2 & R3 --> Lookup
    Lookup --> Context
```

## Multi-Tenant Workflow Definitions

```yaml
# workflows/elixosense/order-flow.yaml
id: elixosense-order
tenant: elixosense  # Explicit tenant binding

# workflows/mama-mboga/order-flow.yaml  
id: mama-mboga-order
tenant: mama-mboga

# Or stored in database with tenant_id
```

```mermaid
flowchart TB
    subgraph Storage["Workflow Storage Options"]
        FS["File System\nworkflows/{tenant}/"]
        DB["Database\nworkflow_definitions\nwith tenant_id"]
    end

    subgraph Resolution["Workflow Resolution"]
        RES["Find workflows where:\n- trigger matches event\n- tenant = current tenant"]
    end

    FS --> RES
    DB --> RES
```

## Cross-Tenant Considerations

```mermaid
flowchart TB
    subgraph Allowed["✅ Allowed"]
        A1["Tenant A reads\nTenant A data"]
        A2["Tenant A writes\nTenant A data"]
    end

    subgraph Blocked["❌ Blocked by RLS"]
        B1["Tenant A reads\nTenant B data"]
        B2["Tenant A writes\nTenant B data"]
    end

    subgraph Admin["👑 Admin Operations"]
        C1["Service role bypasses RLS\nfor cross-tenant operations"]
    end

    style Blocked fill:#ffebee
    style Admin fill:#fff3e0
```

## Tenant Onboarding Checklist

```mermaid
flowchart TB
    START([New Tenant]) --> S1["Create business record"]
    S1 --> S2["Configure integrations\n(WhatsApp, M-Pesa)"]
    S2 --> S3["Set up parser config\n(product aliases, units)"]
    S3 --> S4["Deploy workflow definitions"]
    S4 --> S5["Configure webhooks\n(if external integrations)"]
    S5 --> S6["Create merchant user"]
    S6 --> DONE([Tenant Ready])
```
