# State Machines

**Order and payment lifecycle states**

---

## Documents

| Document | Purpose |
|----------|---------|
| [[ORDER_STATES]] | Order lifecycle states |
| [[PAYMENT_STATES]] | Payment lifecycle states |

---

## Order States

```
pending → partial → paid → fulfilled
    │         │        │
    └─────────┴────────┴──→ cancelled
```

| State | Description |
|-------|-------------|
| `pending` | Order created, no payment |
| `partial` | Some payment received |
| `paid` | Fully paid |
| `fulfilled` | Delivered/completed |
| `cancelled` | Order cancelled |

→ [[ORDER_STATES|Full Order State Documentation]]

---

## Payment States

```
initiated → pending → confirmed → applied
                │
                └──→ failed
```

| State | Description |
|-------|-------------|
| `initiated` | STK Push sent |
| `pending` | Awaiting confirmation |
| `confirmed` | Payment received |
| `applied` | Applied to order |
| `failed` | Payment failed |

→ [[PAYMENT_STATES|Full Payment State Documentation]]

---

## Related Diagrams

- [[../diagrams/04-workflow-execution|Workflow Execution]]

---

## Back to Main Docs

- [[../HOME|← Home]]

---

#kcos #state-machines #orders #payments
