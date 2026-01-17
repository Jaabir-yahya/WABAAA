# KCOS Lego Architecture

## The Composability Model

KCOS is built like Lego blocks - infinite workflows from finite, composable actions.

```mermaid
flowchart TB
    subgraph Traditional["❌ Traditional Approach (Wrong for Kenya)"]
        FW1["Fixed Order Workflow"]
        FW2["Fixed Payment Workflow"]
        FW3["Fixed Reminder Workflow"]
    end

    subgraph KCOS["✅ KCOS Lego Approach"]
        subgraph Blocks["🧱 Action Blocks"]
            A1["whatsapp.send"]
            A2["mpesa.initiate"]
            A3["order.create"]
            A4["actor.resolve"]
            A5["qr.generate"]
            A6["condition.if"]
            A7["webhook.call"]
            A8["event.log"]
        end

        subgraph Workflows["🔗 Wired Workflows"]
            W1["Client A: Order Flow"]
            W2["Client B: QR Access"]
            W3["Client C: Invoice Processing"]
            W4["Client D: Custom Flow"]
        end
    end

    A1 & A2 & A3 & A4 --> W1
    A4 & A5 & A6 & A8 --> W2
    A1 & A3 & A7 --> W3
    A1 & A2 & A5 & A6 & A7 --> W4

    style Traditional fill:#ffcccc
    style KCOS fill:#ccffcc
```

## Action Interface (The Lego Block Shape)

All actions share the same interface - this is what makes them composable:

```mermaid
classDiagram
    class Action {
        +string id
        +ActionCategory category
        +string description
        +JSONSchema inputSchema
        +JSONSchema outputSchema
        +boolean retryable
        +boolean idempotent
        +execute(input, context) ActionOutput
        +compensate(input, context) void
    }

    class ActionInput {
        +[key: string] any
    }

    class ActionContext {
        +string tenantId
        +string workflowId
        +string correlationId
        +Record variables
        +string idempotencyKey
        +string stepId
    }

    class ActionOutput {
        +boolean success
        +any data
        +string error
        +string errorCode
        +boolean shouldRetry
    }

    Action --> ActionInput : receives
    Action --> ActionContext : uses
    Action --> ActionOutput : returns
```

## Workflow Definition Structure

```mermaid
classDiagram
    class WorkflowDefinition {
        +string id
        +string name
        +string description
        +string version
        +WorkflowTrigger trigger
        +WorkflowStep[] steps
        +ErrorHandling onError
    }

    class WorkflowTrigger {
        +TriggerType type
        +FilterCondition[] conditions
        +CronExpression schedule
    }

    class WorkflowStep {
        +string id
        +string action
        +Record input
        +string output
        +string when
        +WorkflowStep[] then
        +WorkflowStep[] else
        +string onError
        +string compensation
        +RetryPolicy retryPolicy
    }

    class FilterCondition {
        +string field
        +Operator operator
        +any value
    }

    WorkflowDefinition --> WorkflowTrigger
    WorkflowDefinition --> WorkflowStep
    WorkflowTrigger --> FilterCondition
    WorkflowStep --> WorkflowStep : branches
```

## Data Flow Between Steps

```mermaid
flowchart LR
    subgraph Step1["Step 1: actor.resolve"]
        I1["input:\n  phone: trigger.data.from"]
        O1["output: customer\n  {id, displayName, phone}"]
    end

    subgraph Step2["Step 2: order.create"]
        I2["input:\n  customerPhone: customer.phone\n  customerId: customer.id"]
        O2["output: order\n  {id, total, status}"]
    end

    subgraph Step3["Step 3: mpesa.initiate"]
        I3["input:\n  phone: customer.phone\n  amount: order.total"]
        O3["output: payment\n  {checkoutRequestId}"]
    end

    subgraph Step4["Step 4: whatsapp.send"]
        I4["input:\n  to: customer.phone\n  message: 'Order ' & order.id"]
        O4["output: message\n  {messageId, status}"]
    end

    O1 -->|"{{ customer.* }}"| I2
    O2 -->|"{{ order.* }}"| I3
    O1 -->|"{{ customer.phone }}"| I3
    O1 & O2 -->|"{{ expressions }}"| I4

    style I1 fill:#e1f5fe
    style I2 fill:#e1f5fe
    style I3 fill:#e1f5fe
    style I4 fill:#e1f5fe
    style O1 fill:#c8e6c9
    style O2 fill:#c8e6c9
    style O3 fill:#c8e6c9
    style O4 fill:#c8e6c9
```

## Why This Architecture?

| Challenge | How Lego Solves It |
|-----------|-------------------|
| Unknown QR use cases | QR actions wire into ANY workflow |
| Different client flows | Each client defines their own workflow |
| Adding new capabilities | Add new action, all workflows can use it |
| Existing code must work | Edge functions become action wrappers |
| Future requirements | New actions + new workflows = infinite combinations |

## Industry Validation

```mermaid
mindmap
    root((KCOS Lego))
        Temporal.io
            Workflows
            Activities
            Durable Execution
        Zapier/n8n
            Triggers
            Actions
            Flows
        AWS Step Functions
            State Machines
            Lambda Functions
        Serverless Workflow
            CNCF Standard
            Declarative DSL
```
