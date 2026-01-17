# KCOS Data Architecture

## Event Sourcing Model

```mermaid
flowchart TB
    subgraph Events["📜 Event Lake (Source of Truth)"]
        EV[(commerce_events)]
        
        E1["whatsapp_message_in"]
        E2["whatsapp_message_out"]
        E3["order.created"]
        E4["mpesa_payment_callback"]
        E5["payment.recorded"]
        E6["order.updated"]
        
        EV --- E1 & E2 & E3 & E4 & E5 & E6
    end

    subgraph Projections["📊 Operational Projections (Query Optimized)"]
        ORD[(orders)]
        PAY[(payments)]
        ACT[(actors)]
        MENU[(menu_items)]
        MOD[(order_modifiers)]
    end

    subgraph Rebuild["🔄 Projection Rebuild"]
        RB["Can rebuild any projection\nby replaying events"]
    end

    E3 -->|projects to| ORD
    E4 & E5 -->|projects to| PAY
    E6 -->|updates| ORD
    
    EV -.->|replay| RB
    RB -.->|rebuild| Projections
```

## Database Schema

```mermaid
erDiagram
    BUSINESSES ||--o{ COMMERCE_EVENTS : "generates"
    BUSINESSES ||--o{ ORDERS : "has"
    BUSINESSES ||--o{ PAYMENTS : "receives"
    BUSINESSES ||--o{ ACTORS : "interacts_with"
    BUSINESSES ||--o{ MENU_ITEMS : "sells"
    BUSINESSES ||--o{ WORKFLOW_DEFINITIONS : "defines"
    
    ORDERS ||--o{ PAYMENTS : "paid_by"
    ORDERS ||--o{ ORDER_MODIFIERS : "has"
    ORDERS }o--|| ACTORS : "placed_by"
    
    WORKFLOW_DEFINITIONS ||--o{ WORKFLOW_INSTANCES : "executes_as"
    WORKFLOW_INSTANCES ||--o{ WORKFLOW_EVENTS : "logs"

    BUSINESSES {
        text id PK
        text name
        text business_type
        jsonb config
        timestamptz created_at
    }

    COMMERCE_EVENTS {
        bigint id PK
        text business_id FK
        text event_type
        text source_channel
        text source_id
        text customer_phone
        jsonb payload
        text idempotency_key UK
        text processing_status
        timestamptz occurred_at
        timestamptz created_at
    }

    ORDERS {
        uuid id PK
        text business_id FK
        text customer_phone
        text customer_name
        numeric total_amount
        numeric outstanding_amount
        text status
        jsonb items
        boolean is_credit
        text payment_terms
        text delivery_address
        timestamptz created_at
    }

    PAYMENTS {
        uuid id PK
        text business_id FK
        uuid order_id FK
        numeric amount
        numeric applied_amount
        text method
        text reference
        text status
        timestamptz created_at
    }

    ACTORS {
        uuid id PK
        text business_id FK
        text actor_type
        text display_name
        text phone
        text email
        text national_id
        numeric trust_score
        jsonb metadata
        timestamptz created_at
    }

    MENU_ITEMS {
        uuid id PK
        text business_id FK
        text name
        numeric base_price
        text category
        boolean available
        jsonb modifiers
    }

    ORDER_MODIFIERS {
        uuid id PK
        uuid order_id FK
        text modifier_type
        text modifier_value
        numeric price_adjustment
    }

    WORKFLOW_DEFINITIONS {
        uuid id PK
        text tenant_id FK
        text workflow_id
        text name
        jsonb definition
        text trigger_type
        boolean is_active
        timestamptz created_at
    }

    WORKFLOW_INSTANCES {
        uuid id PK
        text tenant_id FK
        uuid definition_id FK
        text status
        jsonb trigger_data
        jsonb variables
        text current_step
        timestamptz started_at
        timestamptz completed_at
    }

    WORKFLOW_EVENTS {
        uuid id PK
        uuid instance_id FK
        text step_id
        text action_id
        text event_type
        jsonb input
        jsonb output
        text error
        timestamptz occurred_at
    }
```

## Event Types

```mermaid
mindmap
    root((Event Types))
        WhatsApp
            whatsapp_message_in
            whatsapp_message_out
            whatsapp_status_update
        M-Pesa
            mpesa_stk_initiated
            mpesa_payment_callback
            mpesa_timeout
        Orders
            order.created
            order.updated
            order.fulfilled
            order.cancelled
        Payments
            payment.recorded
            payment.applied
            payment.voided
        Actors
            actor.created
            actor.updated
            actor.merged
        Workflow
            workflow.started
            workflow.completed
            workflow.failed
            step.executed
        QR
            qr.generated
            qr.scanned
        Internal
            merchant_note
            policy_violation
```

## Data Flow

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant WH as Webhook
    participant EV as commerce_events
    participant ORD as orders
    participant PAY as payments

    WA->>WH: Incoming message
    WH->>EV: INSERT whatsapp_message_in
    
    Note over WH: Parse & Process
    
    WH->>ORD: INSERT order
    WH->>EV: INSERT order.created
    
    WH->>WA: Send confirmation
    WH->>EV: INSERT whatsapp_message_out
    
    Note over WA,PAY: Later...
    
    WA->>WH: M-Pesa callback
    WH->>EV: INSERT mpesa_payment_callback
    WH->>PAY: INSERT payment
    WH->>ORD: UPDATE outstanding_amount
    WH->>EV: INSERT payment.applied
```

## Idempotency Pattern

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        REQ["Event with source_id: 'wamid_xxx'"]
    end

    subgraph Check["Idempotency Check"]
        Q["SELECT * FROM commerce_events\nWHERE idempotency_key = 'whatsapp:wamid_xxx'"]
    end

    subgraph Decision{Exists?}
    end

    subgraph Skip["Skip Processing"]
        SKIP["Return cached result\nNo side effects"]
    end

    subgraph Process["Process Event"]
        PROC["Execute logic\nINSERT with idempotency_key"]
    end

    REQ --> Check
    Check --> Decision
    Decision -->|Yes| Skip
    Decision -->|No| Process

    style Skip fill:#e8f5e9
    style Process fill:#e3f2fd
```

## Query Patterns

```sql
-- Get all orders for a business (RLS enforced)
SELECT * FROM orders 
WHERE business_id = 'elixosense'
ORDER BY created_at DESC;

-- Get order with payment status
SELECT 
    o.*,
    COALESCE(SUM(p.applied_amount), 0) as total_paid
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.business_id = 'elixosense'
GROUP BY o.id;

-- Replay events to rebuild state
SELECT * FROM commerce_events
WHERE business_id = 'elixosense'
ORDER BY id ASC;

-- Daily summary
SELECT 
    DATE(created_at) as day,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders
WHERE business_id = 'elixosense'
GROUP BY DATE(created_at);
```
