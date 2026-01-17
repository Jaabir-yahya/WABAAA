# KCOS Integration Patterns

## Integration Overview

```mermaid
flowchart TB
    subgraph KCOS["🇰🇪 KCOS Platform"]
        WE["Workflow Engine"]
        AR["Action Registry"]
    end

    subgraph Inbound["📥 Inbound Integrations"]
        WA_IN["WhatsApp\nWebhook"]
        MP_IN["M-Pesa\nCallback"]
        HTTP_IN["HTTP API\nTrigger"]
        WH_IN["External\nWebhook"]
    end

    subgraph Outbound["📤 Outbound Integrations"]
        WA_OUT["WhatsApp\nCloud API"]
        MP_OUT["M-Pesa\nDaraja"]
        SMS_OUT["Africa's Talking\nSMS"]
        WH_OUT["External\nWebhooks"]
        ERP_OUT["ERP/CRM\nSystems"]
    end

    WA_IN --> WE
    MP_IN --> WE
    HTTP_IN --> WE
    WH_IN --> WE

    AR --> WA_OUT
    AR --> MP_OUT
    AR --> SMS_OUT
    AR --> WH_OUT
    AR --> ERP_OUT

    WE <--> AR
```

## Pattern 1: Inbound Webhook Integration

Use this when external systems need to trigger KCOS workflows.

```mermaid
sequenceDiagram
    participant EXT as External System
    participant WH as Webhook Handler
    participant WE as Workflow Engine
    participant DB as Database

    EXT->>WH: POST /webhooks/external-system
    WH->>WH: Verify signature/auth
    WH->>DB: Log incoming event
    WH->>WE: Match & trigger workflow
    WE->>WE: Execute workflow
    WE-->>WH: Result
    WH-->>EXT: 200 OK (acknowledged)
```

### Implementation

```typescript
// supabase/functions/external-webhook/index.ts
Deno.serve(async (req: Request) => {
  // 1. Verify request (signature, API key, etc.)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== Deno.env.get('EXTERNAL_API_KEY')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse payload
  const payload = await req.json();

  // 3. Log to event store
  await supabase.from('commerce_events').insert({
    business_id: payload.businessId,
    event_type: 'webhook.external_system',
    payload,
    idempotency_key: `external:${payload.eventId}`,
  });

  // 4. Trigger matching workflow
  await triggerWorkflow('external-system-flow', payload);

  return new Response(JSON.stringify({ status: 'ok' }));
});
```

## Pattern 2: Outbound Webhook (webhook.call)

Use this to push data to external systems from workflows.

```mermaid
sequenceDiagram
    participant WE as Workflow Engine
    participant WC as webhook.call Action
    participant EXT as External API

    WE->>WC: Execute with input
    WC->>WC: Resolve URL, headers, body
    WC->>EXT: HTTP POST /api/endpoint
    
    alt Success
        EXT-->>WC: 200 OK { data }
        WC-->>WE: { success: true, data }
    else Failure
        EXT-->>WC: 500 Error
        WC-->>WE: { success: false, shouldRetry: true }
        WE->>WC: Retry (per policy)
    end
```

### Workflow Usage

```yaml
steps:
  - id: sync_to_erp
    action: webhook.call
    input:
      url: "https://erp.example.com/api/orders"
      method: POST
      headers:
        Authorization: "Bearer {{ tenant.config.erpApiKey }}"
        Content-Type: "application/json"
      body:
        orderId: "{{ order.id }}"
        customerPhone: "{{ customer.phone }}"
        total: "{{ order.total }}"
        items: "{{ order.items }}"
      timeout: 30000
    retryPolicy:
      maxRetries: 3
      backoffStrategy: exponential
      initialInterval: "2s"
```

## Pattern 3: Bi-Directional Sync

For systems that need both push and pull.

```mermaid
flowchart TB
    subgraph KCOS["KCOS"]
        DB[(Database)]
        WE["Workflow Engine"]
        SYNC["sync-external\nScheduled Job"]
    end

    subgraph External["External System"]
        EXT_API["External API"]
        EXT_WH["Webhook Endpoint"]
    end

    WE -->|"webhook.call\n(push changes)"| EXT_API
    EXT_WH -->|"webhook.received\n(receive updates)"| WE
    
    SYNC -->|"Periodic pull\n(reconciliation)"| EXT_API
    EXT_API -->|"Bulk data"| SYNC
    SYNC --> DB
```

### Sync Workflow

```yaml
id: erp-bidirectional-sync
name: ERP Bi-directional Sync
trigger:
  type: schedule.cron
  schedule: "0 */6 * * *"  # Every 6 hours

steps:
  # Pull changes from ERP
  - id: fetch_erp_updates
    action: http.request
    input:
      url: "{{ tenant.config.erpUrl }}/api/changes"
      method: GET
      headers:
        Authorization: "Bearer {{ tenant.config.erpApiKey }}"
      query:
        since: "{{ tenant.config.lastSyncAt }}"
    output: erpChanges

  # Process each change
  - id: process_changes
    action: loop.each
    input:
      items: "{{ erpChanges.data }}"
      itemVariable: "change"
      steps:
        - id: apply_change
          action: data.transform
          input:
            # Map ERP format to KCOS format
            expression: |
              {
                "type": change.entityType,
                "action": change.action,
                "data": change.payload
              }
```

## Pattern 4: Event Bridge (Pub/Sub)

For loose coupling with multiple subscribers.

```mermaid
flowchart LR
    subgraph Publishers["Event Publishers"]
        P1["Order Workflow"]
        P2["Payment Workflow"]
        P3["External Webhook"]
    end

    subgraph EventBus["Event Bus (commerce_events)"]
        EB[(Event Store)]
    end

    subgraph Subscribers["Event Subscribers"]
        S1["Analytics\nWorkflow"]
        S2["Notification\nWorkflow"]
        S3["External Sync\nWorkflow"]
    end

    P1 -->|"order.created"| EB
    P2 -->|"payment.completed"| EB
    P3 -->|"external.event"| EB

    EB -->|"trigger"| S1
    EB -->|"trigger"| S2
    EB -->|"trigger"| S3
```

### Event-Triggered Workflow

```yaml
id: on-order-created-sync
name: Sync Order to External Systems
trigger:
  type: event.emitted
  conditions:
    - field: "{{ data.event_type }}"
      operator: equals
      value: "order.created"

steps:
  - id: notify_warehouse
    action: webhook.call
    input:
      url: "{{ tenant.config.warehouseWebhook }}"
      body:
        orderId: "{{ trigger.data.payload.orderId }}"
        items: "{{ trigger.data.payload.items }}"

  - id: update_analytics
    action: webhook.call
    input:
      url: "{{ tenant.config.analyticsEndpoint }}"
      body:
        event: "new_order"
        value: "{{ trigger.data.payload.total }}"
```

## Pattern 5: Custom Integration Action

Create a dedicated action for complex integrations.

```mermaid
flowchart TB
    subgraph NewAction["New Custom Action"]
        DEF["packages/core/actions/builtin/\nerp-sync.ts"]
        
        CODE["export const erpSyncAction = defineAction({\n  id: 'erp.sync',\n  category: 'integration',\n  execute(input, context) {\n    // Custom ERP logic\n  }\n})"]
    end

    subgraph Register["Register Action"]
        REG["actionRegistry.register(erpSyncAction)"]
    end

    subgraph Use["Use in Workflows"]
        WF["steps:\n  - action: erp.sync\n    input:\n      operation: 'create_invoice'"]
    end

    DEF --> CODE
    CODE --> Register
    Register --> Use
```

### Custom Action Template

```typescript
// packages/core/actions/builtin/erp-sync.ts
import { defineAction, success, failure } from '../helpers';

export const erpSyncAction = defineAction({
  id: 'erp.sync',
  category: 'integration',
  description: 'Sync data with external ERP system',
  
  inputSchema: {
    type: 'object',
    required: ['operation', 'data'],
    properties: {
      operation: {
        type: 'string',
        enum: ['create_order', 'update_inventory', 'create_invoice']
      },
      data: { type: 'object' }
    }
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      erpId: { type: 'string' },
      status: { type: 'string' }
    }
  },
  
  retryable: true,
  idempotent: true,
  
  async execute(input, context) {
    const erpUrl = process.env.ERP_API_URL;
    const erpKey = process.env.ERP_API_KEY;
    
    try {
      const response = await fetch(`${erpUrl}/${input.operation}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${erpKey}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId,
          'X-Idempotency-Key': context.idempotencyKey
        },
        body: JSON.stringify(input.data)
      });
      
      if (!response.ok) {
        return failure(`ERP error: ${response.status}`, {
          shouldRetry: response.status >= 500
        });
      }
      
      const result = await response.json();
      return success({
        erpId: result.id,
        status: result.status
      });
    } catch (error) {
      return failure(error.message, { shouldRetry: true });
    }
  }
});
```

## Integration Checklist

```mermaid
flowchart TB
    START([Plan Integration]) --> Q1{Inbound or\nOutbound?}
    
    Q1 -->|Inbound| IN1["Create webhook handler\nin supabase/functions/"]
    IN1 --> IN2["Verify auth/signature"]
    IN2 --> IN3["Log to commerce_events"]
    IN3 --> IN4["Trigger workflow"]
    
    Q1 -->|Outbound| OUT1{Use existing\nwebhook.call?}
    
    OUT1 -->|Yes| OUT2["Define in workflow YAML\nwith retry policy"]
    OUT1 -->|No| OUT3["Create custom action\nin packages/core/actions/"]
    
    OUT3 --> OUT4["Register action"]
    OUT4 --> OUT5["Use in workflow"]
    
    OUT2 --> DONE
    OUT5 --> DONE
    IN4 --> DONE
    
    DONE([Integration Complete])
```
