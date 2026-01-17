# KCOS System Architecture

## High-Level Overview

```mermaid
flowchart TB
    subgraph External["🌍 External Systems"]
        WA["WhatsApp Cloud API"]
        MP["M-Pesa Daraja API"]
        AT["Africa's Talking SMS"]
        ERP["External ERPs"]
    end

    subgraph Ingestion["📥 Ingestion Layer (Edge Functions)"]
        WAH["whatsapp-webhook"]
        MPH["mpesa-callback"]
        HTTP["http-trigger"]
        CRON["scheduled-tasks"]
    end

    subgraph Core["⚙️ KCOS Core Engine"]
        WE["Workflow Engine"]
        AR["Action Registry"]
        EE["Expression Evaluator"]
        PR["Parser Registry"]
    end

    subgraph Actions["🧱 Action Categories"]
        COM["Communication\nwhatsapp.send\nsms.send"]
        PAY["Payment\nmpesa.initiate\npayment.record"]
        DAT["Data\norder.create\nevent.log"]
        INT["Integration\nwebhook.call\nhttp.request"]
        QR["QR\nqr.generate\nqr.decode"]
        CTL["Control\ncondition.if\nloop.each"]
    end

    subgraph Data["💾 Data Layer"]
        EV[(commerce_events\nEvent Lake)]
        ORD[(orders)]
        PAY_T[(payments)]
        ACT[(actors)]
        WF[(workflow_definitions)]
    end

    subgraph UI["📱 Presentation"]
        PWA["Merchant PWA\n(Svelte)"]
        STORE["Storefront\n(Svelte)"]
    end

    WA --> WAH
    MP --> MPH
    ERP -.-> HTTP

    WAH --> WE
    MPH --> WE
    HTTP --> WE
    CRON --> WE

    WE --> AR
    WE --> EE
    AR --> COM
    AR --> PAY
    AR --> DAT
    AR --> INT
    AR --> QR
    AR --> CTL

    COM --> WA
    COM --> AT
    PAY --> MP
    INT --> ERP

    DAT --> EV
    EV --> ORD
    EV --> PAY_T
    EV --> ACT

    ORD --> PWA
    PAY_T --> PWA
    ORD --> STORE
```

## Component Responsibilities

### Ingestion Layer
- **whatsapp-webhook**: Receives WhatsApp messages, verifies signatures, routes to workflows
- **mpesa-callback**: Handles M-Pesa STK Push callbacks, updates payment status
- **http-trigger**: API endpoint for manual/external workflow triggers
- **scheduled-tasks**: Cron-based workflows (reminders, summaries)

### Core Engine
- **Workflow Engine**: Executes workflow definitions step-by-step
- **Action Registry**: Catalog of all available actions
- **Expression Evaluator**: JSONata-based `{{ }}` expression resolution
- **Parser Registry**: Business-type-specific message parsers

### Data Layer
- **commerce_events**: Immutable event log (source of truth)
- **orders/payments/actors**: Operational projections for queries
- **workflow_definitions**: Stored workflow YAML/JSON

## Request Flow

```mermaid
sequenceDiagram
    participant Ext as External System
    participant Webhook as Edge Function
    participant Engine as Workflow Engine
    participant Registry as Action Registry
    participant Action as Action
    participant DB as Database

    Ext->>Webhook: Event (WhatsApp/M-Pesa/HTTP)
    Webhook->>Engine: Trigger workflow
    
    loop For each step
        Engine->>Engine: Resolve {{ expressions }}
        Engine->>Registry: Get action
        Registry-->>Engine: Action instance
        Engine->>Action: Execute(input, context)
        Action->>DB: Read/Write data
        DB-->>Action: Result
        Action-->>Engine: ActionOutput
        Engine->>Engine: Store output in variables
    end
    
    Engine-->>Webhook: WorkflowResult
    Webhook-->>Ext: Response
```

## Key Design Principles

1. **Event Sourcing**: All state changes logged to `commerce_events`
2. **Multi-Tenant**: Every operation scoped by `business_id` with RLS
3. **Composable**: Actions are atomic, workflows wire them together
4. **Declarative**: Workflows defined in YAML, not code
5. **Idempotent**: Actions safe to retry with same input
