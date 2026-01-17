# KCOS Trigger Catalog

## All Available Triggers

```mermaid
mindmap
    root((Workflow Triggers))
        Real-Time
            whatsapp.received
                Text messages
                Documents
                Images
            mpesa.callback
                STK Push result
                C2B payment
            qr.scanned
                Product QR
                Access QR
                Invoice QR
            webhook.received
                External systems
                Partner APIs
        Scheduled
            schedule.cron
                Daily summary
                Reminders
                Reconciliation
        Manual
            manual.trigger
                API call
                Admin action
            http.request
                REST endpoint
        Internal
            event.emitted
                Order events
                Payment events
                Custom events
```

## Trigger Details

### whatsapp.received

```mermaid
sequenceDiagram
    participant C as Customer
    participant WA as WhatsApp
    participant WH as Webhook
    participant WE as Workflow Engine

    C->>WA: Send message
    WA->>WH: POST webhook payload
    WH->>WH: Verify signature
    WH->>WE: Trigger workflows where<br/>trigger.type = 'whatsapp.received'<br/>AND conditions match
```

#### Trigger Schema

```yaml
trigger:
  type: whatsapp.received
  conditions:
    # Filter by message type
    - field: "{{ data.type }}"
      operator: equals
      value: "text"
    
    # Filter by content keywords
    - field: "{{ data.text }}"
      operator: contains
      value: ["nataka", "order", "oda"]
    
    # Filter by sender (optional)
    - field: "{{ data.from }}"
      operator: matches
      value: "^254"

# Available in trigger context:
# trigger.data.id       - Message ID
# trigger.data.from     - Sender phone
# trigger.data.text     - Message body (if text)
# trigger.data.type     - Message type (text, document, image)
# trigger.data.document - Document info (if document)
# trigger.timestamp     - When received
```

### mpesa.callback

```mermaid
sequenceDiagram
    participant C as Customer
    participant MP as M-Pesa
    participant CB as Callback Handler
    participant WE as Workflow Engine

    C->>MP: Confirm STK Push
    MP->>CB: POST callback payload
    CB->>CB: Parse & validate
    CB->>WE: Trigger workflows where<br/>trigger.type = 'mpesa.callback'
```

#### Trigger Schema

```yaml
trigger:
  type: mpesa.callback
  conditions:
    # Only successful payments
    - field: "{{ data.ResultCode }}"
      operator: equals
      value: 0
    
    # Optional: specific amount range
    - field: "{{ data.Amount }}"
      operator: gt
      value: 100

# Available in trigger context:
# trigger.data.ResultCode        - 0 = success
# trigger.data.Amount            - Payment amount
# trigger.data.MpesaReceiptNumber - Receipt ID
# trigger.data.TransactionDate   - When paid
# trigger.data.PhoneNumber       - Payer phone
# trigger.data.CheckoutRequestID - Original request ID
```

### qr.scanned

```mermaid
sequenceDiagram
    participant U as User
    participant APP as Scanner App
    participant API as QR API
    participant WE as Workflow Engine

    U->>APP: Scan QR code
    APP->>API: POST { qrReference }
    API->>API: Decode QR data
    API->>WE: Trigger workflows where<br/>trigger.type = 'qr.scanned'
```

#### Trigger Schema

```yaml
trigger:
  type: qr.scanned
  conditions:
    # Filter by QR type
    - field: "{{ data.qrType }}"
      operator: equals
      value: "product"  # or: invoice, access, shop, menu

# Available in trigger context:
# trigger.data.reference   - KCOS QR reference
# trigger.data.qrType      - Type of QR
# trigger.data.businessId  - Owning business
# trigger.data.payload     - Embedded data
# trigger.data.scannedAt   - Timestamp
# trigger.data.scannerId   - Who scanned (if known)
```

### schedule.cron

```mermaid
flowchart TB
    subgraph Scheduler["⏰ Scheduler"]
        CRON["Cron Expression Parser"]
        CHECK["Check: Is it time?"]
    end

    subgraph Workflows["Scheduled Workflows"]
        W1["Daily Summary\n0 18 * * *\n(6pm daily)"]
        W2["Payment Reminders\n0 9 * * *\n(9am daily)"]
        W3["Inventory Sync\n0 */6 * * *\n(every 6 hours)"]
    end

    subgraph Engine["Workflow Engine"]
        WE["Execute workflow"]
    end

    CRON --> CHECK
    CHECK -->|"Match"| Workflows
    Workflows --> WE
```

#### Trigger Schema

```yaml
trigger:
  type: schedule.cron
  schedule: "0 18 * * *"  # CRON expression

# Common schedules:
# "0 9 * * *"     - Daily at 9am
# "0 18 * * *"    - Daily at 6pm
# "0 */6 * * *"   - Every 6 hours
# "0 9 * * 1"     - Mondays at 9am
# "*/15 * * * *"  - Every 15 minutes

# Available in trigger context:
# trigger.scheduledAt - When triggered
# trigger.timezone    - Configured timezone (Africa/Nairobi)
```

### http.request

```mermaid
sequenceDiagram
    participant EXT as External System
    participant API as HTTP Endpoint
    participant AUTH as Auth Layer
    participant WE as Workflow Engine

    EXT->>API: POST /trigger/{workflow-id}
    API->>AUTH: Validate API key/JWT
    AUTH-->>API: Authorized
    API->>WE: Trigger workflow with payload
    WE-->>API: Result
    API-->>EXT: Response
```

#### Trigger Schema

```yaml
trigger:
  type: http.request
  # No conditions - triggered directly via API

# Available in trigger context:
# trigger.data.*       - Request body fields
# trigger.headers.*    - Request headers
# trigger.method       - HTTP method
# trigger.path         - Request path
```

### event.emitted

```mermaid
flowchart TB
    subgraph Sources["Event Sources"]
        S1["order.create action"]
        S2["payment.record action"]
        S3["External webhook"]
    end

    subgraph EventBus["Event Bus"]
        EB[(commerce_events)]
    end

    subgraph Subscribers["Subscribing Workflows"]
        W1["On Order Created"]
        W2["On Payment Received"]
        W3["On Any Event"]
    end

    S1 -->|"order.created"| EB
    S2 -->|"payment.completed"| EB
    S3 -->|"external.*"| EB

    EB --> W1
    EB --> W2
    EB --> W3
```

#### Trigger Schema

```yaml
trigger:
  type: event.emitted
  conditions:
    - field: "{{ data.event_type }}"
      operator: equals
      value: "order.created"

# Available in trigger context:
# trigger.data.event_type   - Event type
# trigger.data.payload      - Event payload
# trigger.data.occurred_at  - When event occurred
# trigger.data.source       - Event source
```

## Trigger Selection Guide

```mermaid
flowchart TB
    START([What triggers your workflow?])
    
    START --> Q1{Customer initiated?}
    
    Q1 -->|WhatsApp message| WA["whatsapp.received"]
    Q1 -->|QR code scan| QR["qr.scanned"]
    Q1 -->|Payment| MP["mpesa.callback"]
    
    Q1 -->|No| Q2{Time-based?}
    
    Q2 -->|Daily/Weekly| CRON["schedule.cron"]
    Q2 -->|No| Q3{External system?}
    
    Q3 -->|API call| HTTP["http.request"]
    Q3 -->|Webhook| WH["webhook.received"]
    
    Q3 -->|No| Q4{Internal event?}
    
    Q4 -->|Yes| EV["event.emitted"]
    Q4 -->|Manual| MAN["manual.trigger"]
```

## Filter Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `{{ data.type }}` equals `"text"` |
| `contains` | Contains substring/item | `{{ data.text }}` contains `["order", "oda"]` |
| `matches` | Regex match | `{{ data.from }}` matches `"^254"` |
| `gt` | Greater than | `{{ data.amount }}` gt `100` |
| `lt` | Less than | `{{ data.amount }}` lt `10000` |
| `in` | In array | `{{ data.status }}` in `["pending", "partial"]` |

## Multiple Triggers Example

```yaml
# A workflow can only have ONE trigger
# For multiple entry points, create separate workflows 
# that call a shared workflow

# workflows/order-via-whatsapp.yaml
id: order-via-whatsapp
trigger:
  type: whatsapp.received
steps:
  - id: process
    action: workflow.call
    input:
      workflowId: shared-order-processing
      data: "{{ trigger.data }}"

# workflows/order-via-api.yaml
id: order-via-api
trigger:
  type: http.request
steps:
  - id: process
    action: workflow.call
    input:
      workflowId: shared-order-processing
      data: "{{ trigger.data }}"
```
