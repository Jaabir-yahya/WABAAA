# Business Flows

**Industry-specific workflow patterns**

---

## Available Flows

| Flow | Industry | Document |
|------|----------|----------|
| **Mini Supermarket** | Retail | [[MINI_SUPERMARKET_FLOW]] |
| **Restaurant** | F&B | [[RESTAURANT_FLOW]] |
| **Multi-Tenant** | Platform | [[MULTI_TENANT_FLOW]] |

---

## Mini Supermarket Flow

WhatsApp ordering for small retail shops (dukas).

**Key Actions**:
- `whatsapp.received` → `document.parse` → `order.create` → `mpesa.initiate`

→ [[MINI_SUPERMARKET_FLOW|Full Documentation]]

---

## Restaurant Flow

Order management for restaurants and food service.

**Key Actions**:
- Order taking, kitchen display, delivery tracking

→ [[RESTAURANT_FLOW|Full Documentation]]

---

## Multi-Tenant Flow

How multiple businesses share the platform with isolation.

**Key Concepts**:
- RLS (Row Level Security)
- Per-tenant configuration
- Workflow scoping

→ [[MULTI_TENANT_FLOW|Full Documentation]]

---

## Example Workflows

For more workflow patterns, see:
- [[../diagrams/09-example-workflows|Example Workflows Diagram]]
- [[../architecture/KCOS-INDUSTRY-WORKFLOW-GUIDE|Industry Workflow Guide]]

---

## Back to Main Docs

- [[../HOME|← Home]]

---

#kcos #flows #workflows #retail #restaurant
