# KCOS Quick Start Guide

**Start Here**: This guide gets you building in 15 minutes.

---

## What You're Building

A **composable commerce platform** where:
- **Actions** = Lego blocks (whatsapp.send, mpesa.initiate, order.create)
- **Workflows** = Wiring blocks together (YAML definitions)
- **Engine** = Runs any workflow (powered by Temporal.io)

---

## Documentation Map

| Document | Time | Purpose |
|----------|------|---------|
| **This Guide** | 15 min | Start here - quick overview |
| [KCOS-LEGO-ARCHITECTURE.md](KCOS-LEGO-ARCHITECTURE.md) | 30 min | Full architecture explanation |
| [KCOS-ACTION-SPECIFICATION.md](KCOS-ACTION-SPECIFICATION.md) | 45 min | How to build actions |
| [KCOS-WORKFLOW-SPECIFICATION.md](KCOS-WORKFLOW-SPECIFICATION.md) | 45 min | How to define workflows |
| [KCOS-IMPLEMENTATION-PLAN.md](KCOS-IMPLEMENTATION-PLAN.md) | 30 min | 6-week implementation plan |
| [KCOS-ARCHITECTURE-VALIDATION.md](KCOS-ARCHITECTURE-VALIDATION.md) | 30 min | Research validation & refinements |

---

## The Core Idea (2 minutes)

```
ANY INPUT        →   ACTION    →   ANY OUTPUT
(WhatsApp)           (block)       (M-Pesa)
(QR Scan)            (block)       (WhatsApp)
(M-Pesa)             (block)       (Order)
(Schedule)           (block)       (SMS)

WORKFLOW = Wiring blocks together
```

**Example**: WhatsApp Order Flow
```
whatsapp.received → document.parse → order.create → mpesa.initiate → whatsapp.send
```

---

## Your First 3 Days

### Day 1: Build Two Actions (4 hours)

**Goal**: Prove the pattern works.

```bash
# Create the structure
mkdir -p packages/core/actions
touch packages/core/actions/types.ts
touch packages/core/actions/registry.ts
```

**1. Define the Action interface** (`types.ts`):
```typescript
export interface Action {
  id: string;
  category: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
  execute(input: any, context: ActionContext): Promise<ActionOutput>;
}

export interface ActionContext {
  tenantId: string;
  workflowId: string;
  idempotencyKey: string;
}

export interface ActionOutput {
  success: boolean;
  data?: any;
  error?: string;
}
```

**2. Create the registry** (`registry.ts`):
```typescript
import { Action } from './types';

class ActionRegistry {
  private actions = new Map<string, Action>();
  
  register(action: Action) {
    this.actions.set(action.id, action);
  }
  
  get(id: string) {
    return this.actions.get(id);
  }
  
  list() {
    return Array.from(this.actions.values());
  }
}

export const actionRegistry = new ActionRegistry();
```

**3. Build first action** (`debug/log.ts`):
```typescript
import { Action } from '../types';

export const debugLogAction: Action = {
  id: 'debug.log',
  category: 'debug',
  description: 'Log a message to console',
  inputSchema: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      logged: { type: 'boolean' }
    }
  },
  
  async execute(input, context) {
    console.log(`[${context.workflowId}] ${input.message}`);
    return { success: true, data: { logged: true } };
  }
};
```

**4. Build second action** (`http/get.ts`):
```typescript
import { Action } from '../types';

export const httpGetAction: Action = {
  id: 'http.get',
  category: 'integration',
  description: 'Make HTTP GET request',
  inputSchema: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      body: { type: 'object' }
    }
  },
  
  async execute(input, context) {
    const response = await fetch(input.url);
    const body = await response.json();
    return { 
      success: true, 
      data: { status: response.status, body } 
    };
  }
};
```

**5. Register and test**:
```typescript
import { actionRegistry } from './registry';
import { debugLogAction } from './debug/log';
import { httpGetAction } from './http/get';

actionRegistry.register(debugLogAction);
actionRegistry.register(httpGetAction);

// Test
async function test() {
  const context = {
    tenantId: 'test',
    workflowId: 'test-001',
    idempotencyKey: 'test-key'
  };
  
  const log = actionRegistry.get('debug.log')!;
  await log.execute({ message: 'Hello KCOS!' }, context);
  
  const http = actionRegistry.get('http.get')!;
  const result = await http.execute({ 
    url: 'https://jsonplaceholder.typicode.com/todos/1' 
  }, context);
  
  console.log('HTTP Result:', result.data);
}

test();
```

**Result**: You have a working action system!

---

### Day 2: Build Simple Engine (4 hours)

**Goal**: Execute a workflow definition.

**1. Define workflow format** (`workflows/types.ts`):
```typescript
export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  action: string;
  input: Record<string, any>;
  output?: string;
}
```

**2. Build simple engine** (`workflows/engine.ts`):
```typescript
import { actionRegistry } from '../actions/registry';
import { WorkflowDefinition, WorkflowStep } from './types';

export async function executeWorkflow(
  definition: WorkflowDefinition,
  triggerData: any,
  tenantId: string
) {
  const variables: Record<string, any> = {
    trigger: triggerData
  };
  
  console.log(`Starting workflow: ${definition.name}`);
  
  for (const step of definition.steps) {
    console.log(`  Executing step: ${step.id}`);
    
    // Get action
    const action = actionRegistry.get(step.action);
    if (!action) throw new Error(`Unknown action: ${step.action}`);
    
    // Resolve input (replace {{ variables }})
    const input = resolveInput(step.input, variables);
    
    // Execute
    const result = await action.execute(input, {
      tenantId,
      workflowId: definition.id,
      idempotencyKey: `${definition.id}-${step.id}`
    });
    
    // Store output
    if (step.output && result.success) {
      variables[step.output] = result.data;
    }
  }
  
  console.log(`Workflow completed!`);
  return variables;
}

function resolveInput(input: any, variables: Record<string, any>): any {
  if (typeof input === 'string' && input.startsWith('{{') && input.endsWith('}}')) {
    const path = input.slice(2, -2).trim();
    return getPath(variables, path);
  }
  if (typeof input === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(input)) {
      resolved[key] = resolveInput(value, variables);
    }
    return resolved;
  }
  return input;
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
```

**3. Create test workflow**:
```typescript
const testWorkflow: WorkflowDefinition = {
  id: 'test-workflow',
  name: 'Test Workflow',
  steps: [
    {
      id: 'log_start',
      action: 'debug.log',
      input: { message: 'Workflow started!' }
    },
    {
      id: 'fetch_data',
      action: 'http.get',
      input: { url: 'https://jsonplaceholder.typicode.com/todos/1' },
      output: 'todoData'
    },
    {
      id: 'log_result',
      action: 'debug.log',
      input: { message: 'Got todo: {{ todoData.body.title }}' }
    }
  ]
};

// Run it
executeWorkflow(testWorkflow, {}, 'test-tenant');
```

**Result**: You have a working workflow engine!

---

### Day 3: Add Real Actions (4 hours)

**Goal**: Wrap existing KCOS functionality as actions.

**1. Wrap WhatsApp** (`communication/whatsapp-send.ts`):
```typescript
import { sendWhatsAppMessage } from '../../_shared/whatsapp-send';
import { Action } from '../types';

export const whatsappSendAction: Action = {
  id: 'whatsapp.send',
  category: 'communication',
  description: 'Send WhatsApp message',
  inputSchema: {
    type: 'object',
    required: ['to', 'message'],
    properties: {
      to: { type: 'string' },
      message: { type: 'string' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      status: { type: 'string' }
    }
  },
  
  async execute(input, context) {
    const result = await sendWhatsAppMessage({
      to: input.to,
      message: input.message
    });
    
    return {
      success: result.success,
      data: { messageId: result.messageId, status: 'sent' },
      error: result.error
    };
  }
};
```

**2. Wrap M-Pesa** (`payment/mpesa-initiate.ts`):
```typescript
import { initiateMPesaPayment } from '../../_shared/mpesa';
import { Action } from '../types';

export const mpesaInitiateAction: Action = {
  id: 'mpesa.initiate',
  category: 'payment',
  description: 'Initiate M-Pesa STK Push',
  inputSchema: {
    type: 'object',
    required: ['phone', 'amount', 'reference'],
    properties: {
      phone: { type: 'string' },
      amount: { type: 'number' },
      reference: { type: 'string' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      checkoutRequestId: { type: 'string' },
      status: { type: 'string' }
    }
  },
  
  async execute(input, context) {
    const result = await initiateMPesaPayment({
      phone: input.phone,
      amount: input.amount,
      reference: input.reference
    });
    
    return {
      success: true,
      data: {
        checkoutRequestId: result.checkoutRequestId,
        status: 'initiated'
      }
    };
  }
};
```

**3. Create ElixoSense workflow** (`workflows/elixosense-order.yaml`):
```yaml
id: elixosense-order
name: ElixoSense WhatsApp Order
steps:
  - id: log_received
    action: debug.log
    input:
      message: "Order received from {{ trigger.from }}"

  - id: parse_order
    action: document.parse
    input:
      text: "{{ trigger.text }}"
      type: "order"
    output: parsed

  - id: create_order
    action: order.create
    input:
      customerPhone: "{{ trigger.from }}"
      items: "{{ parsed.items }}"
      total: "{{ parsed.total }}"
    output: order

  - id: initiate_payment
    action: mpesa.initiate
    input:
      phone: "{{ trigger.from }}"
      amount: "{{ order.total }}"
      reference: "{{ order.id }}"

  - id: send_confirmation
    action: whatsapp.send
    input:
      to: "{{ trigger.from }}"
      message: "Asante! Oda yako: {{ order.items }}. Jumla: KSh {{ order.total }}"
```

**Result**: Real commerce workflow running on your action system!

---

## Next Steps

After Day 3, you have:
- ✅ Action interface and registry
- ✅ Simple workflow engine
- ✅ Real actions (WhatsApp, M-Pesa)
- ✅ First workflow definition

**Week 2**: Integrate Temporal.io for durability
**Week 3**: Add idempotency and event store
**Week 4**: Build more actions (20+ total)
**Week 5**: Create workflow builder UI
**Week 6**: Production deployment

---

## Key Files Reference

```
packages/
  core/
    actions/
      types.ts           # Action interface
      registry.ts        # ActionRegistry
      communication/
        whatsapp-send.ts
        sms-send.ts
      payment/
        mpesa-initiate.ts
      data/
        order-create.ts
        event-log.ts
      control/
        condition-if.ts
    workflows/
      types.ts           # WorkflowDefinition
      engine.ts          # executeWorkflow()
    idempotency/
      client.ts          # withIdempotency()
    expressions/
      evaluator.ts       # JSONata wrapper

workflows/
  elixosense/
    order-flow.yaml
    payment-reminder.yaml
```

---

## Commands

```bash
# Run tests
npm test

# Start Temporal worker (after setup)
npm run temporal:worker

# Run a workflow manually
npm run workflow:run -- --id elixosense-order --trigger '{"from":"254..."}'
```

---

**You now have everything you need to start building. Go!**
