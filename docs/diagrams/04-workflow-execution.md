# KCOS Workflow Execution

## Execution Lifecycle

```mermaid
stateDiagram-v2
    [*] --> TriggerReceived: Event arrives

    TriggerReceived --> MatchingWorkflows: Find workflows
    MatchingWorkflows --> FilterConditions: Check conditions
    
    FilterConditions --> NoMatch: Conditions fail
    FilterConditions --> CreateContext: Conditions pass
    
    NoMatch --> [*]: Discard event
    
    CreateContext --> ExecuteSteps: Initialize variables
    
    ExecuteSteps --> ResolveExpressions: For each step
    ResolveExpressions --> LookupAction: Get action from registry
    LookupAction --> ValidateInput: Check input schema
    ValidateInput --> ExecuteAction: Call action.execute()
    
    ExecuteAction --> StoreOutput: Success
    ExecuteAction --> HandleError: Failure
    
    StoreOutput --> NextStep: More steps?
    NextStep --> ExecuteSteps: Yes
    NextStep --> WorkflowComplete: No
    
    HandleError --> RetryStep: Retryable?
    RetryStep --> ExecuteAction: Yes, retry
    HandleError --> Compensate: No, compensate
    
    Compensate --> WorkflowFailed: Rollback complete
    
    WorkflowComplete --> [*]: Return result
    WorkflowFailed --> [*]: Return error
```

## Step-by-Step Execution

```mermaid
sequenceDiagram
    participant T as Trigger
    participant E as Workflow Engine
    participant X as Expression Evaluator
    participant R as Action Registry
    participant A as Action
    participant D as Database

    T->>E: trigger(workflowDef, triggerData)
    
    Note over E: Initialize Context
    E->>E: context = { trigger: triggerData, variables: {} }

    loop For each step in workflow.steps
        Note over E: Step: resolve_customer
        
        E->>X: resolveInput(step.input, context)
        X-->>E: resolvedInput
        
        E->>R: getAction(step.action)
        R-->>E: action
        
        E->>A: execute(resolvedInput, actionContext)
        
        alt Action succeeds
            A->>D: Database operations
            D-->>A: Result
            A-->>E: { success: true, data: {...} }
            E->>E: context.variables[step.output] = data
            E->>E: context.steps[step.id] = result
        else Action fails
            A-->>E: { success: false, error: "..." }
            
            alt Retryable
                E->>E: Apply retry policy
                E->>A: Retry execute()
            else Not retryable
                E->>E: Run compensation
            end
        end
        
        opt Has branches (then/else)
            E->>E: Evaluate branch condition
            E->>E: Execute branch steps
        end
    end

    E-->>T: WorkflowResult
```

## Expression Resolution

```mermaid
flowchart TB
    subgraph Input["Step Input (YAML)"]
        YAML["input:\n  phone: '{{ trigger.data.from }}'\n  amount: '{{ order.total * 1.16 }}'"]
    end

    subgraph Context["Execution Context"]
        CTX["{\n  trigger: { data: { from: '254...' } },\n  order: { total: 1000 },\n  customer: { name: 'John' }\n}"]
    end

    subgraph Evaluator["JSONata Evaluator"]
        direction TB
        E1["Parse {{ expression }}"]
        E2["Compile JSONata"]
        E3["Evaluate against context"]
        E4["Return resolved value"]
        E1 --> E2 --> E3 --> E4
    end

    subgraph Resolved["Resolved Input"]
        RES["{\n  phone: '254712345678',\n  amount: 1160\n}"]
    end

    YAML --> Evaluator
    CTX --> Evaluator
    Evaluator --> RES
```

## Branching Logic

```mermaid
flowchart TB
    START([Start]) --> STEP1[Step 1: Parse Order]
    
    STEP1 --> COND{condition.if\norder.items.length > 0}
    
    COND -->|then branch| THEN1[Step: Create Order]
    THEN1 --> THEN2[Step: Initiate Payment]
    THEN2 --> THEN3[Step: Send Confirmation]
    
    COND -->|else branch| ELSE1[Step: Send Help Message]
    
    THEN3 --> MERGE([Continue])
    ELSE1 --> MERGE
    
    MERGE --> STEP_FINAL[Step: Log Event]
    STEP_FINAL --> END([End])
    
    style COND fill:#fff3e0
    style THEN1 fill:#e8f5e9
    style THEN2 fill:#e8f5e9
    style THEN3 fill:#e8f5e9
    style ELSE1 fill:#ffebee
```

## Error Handling & Compensation (Saga Pattern)

```mermaid
sequenceDiagram
    participant E as Engine
    participant S1 as order.create
    participant S2 as mpesa.initiate
    participant S3 as whatsapp.send

    Note over E: Forward Execution
    E->>S1: Execute
    S1-->>E: ✓ Success (order created)
    
    E->>S2: Execute
    S2-->>E: ✓ Success (payment initiated)
    
    E->>S3: Execute
    S3-->>E: ✗ FAILED (WhatsApp error)

    Note over E: Compensation (Reverse Order)
    
    rect rgb(255, 235, 238)
        E->>S2: compensate() - payment.void
        S2-->>E: ✓ Payment voided
        
        E->>S1: compensate() - order.cancel
        S1-->>E: ✓ Order cancelled
    end

    E-->>E: Return WorkflowFailed
```

## Parallel Execution

```mermaid
flowchart TB
    START([Start]) --> PARALLEL["parallel.all"]
    
    subgraph PAR["Parallel Execution"]
        direction LR
        P1["Send WhatsApp\nto customer"]
        P2["Send SMS\nto merchant"]
        P3["Log event\nto analytics"]
    end
    
    PARALLEL --> P1 & P2 & P3
    
    P1 & P2 & P3 --> WAIT["Wait for all"]
    
    WAIT --> NEXT[Next Step]
    
    style PARALLEL fill:#e3f2fd
    style PAR fill:#e3f2fd
```

## Retry Policy

```mermaid
flowchart LR
    subgraph RetryPolicy["Retry Configuration"]
        direction TB
        R1["maxRetries: 3"]
        R2["backoffStrategy: exponential"]
        R3["initialInterval: 1s"]
        R4["maxInterval: 30s"]
    end

    subgraph Timeline["Retry Timeline"]
        direction LR
        T1["Attempt 1\n(immediate)"]
        T2["Attempt 2\n(+1s)"]
        T3["Attempt 3\n(+2s)"]
        T4["Attempt 4\n(+4s)"]
        FAIL["Give up"]
        
        T1 -->|fail| T2 -->|fail| T3 -->|fail| T4 -->|fail| FAIL
    end

    RetryPolicy --> Timeline
```
