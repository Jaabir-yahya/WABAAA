# START HERE: KCOS (Commerce Primitives)

**Status:** Foundation built | Workflow engine ready  
**Focus:** Commerce primitives → patterns → industry configuration

---

## What KCOS Is Now

KCOS is a **workflow platform for Kenyan commerce**, built around universal primitives:
Order Intake → Identity → Payment → Notification → Reconciliation.

**You already have:**
- Action system + registry
- Workflow engine + step executor
- JSONata expression evaluator
- HTTP API server
- Kenya actions: WhatsApp, M-Pesa, QR, Order, Actor
- First workflow: `workflows/elixosense/order-flow.yaml`

---

## The Right Reading Order

1. [`docs/KCOS-COMMERCE-PRIMITIVES.md`](docs/KCOS-COMMERCE-PRIMITIVES.md)  
2. [`docs/KCOS-LEGO-ARCHITECTURE.md`](docs/KCOS-LEGO-ARCHITECTURE.md)  
3. [`docs/KCOS-QUICK-START.md`](docs/KCOS-QUICK-START.md)  
4. [`docs/KCOS-DOCUMENTATION-INDEX.md`](docs/KCOS-DOCUMENTATION-INDEX.md)  

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run KCOS API server (workflow execution)
npm run dev:api

# Run core tests
npm run test:core
```

---

## Where to Build Next

1. Implement **pattern workflows** (order-intake, payment-collection, notification).
2. Add **industry configs** (retail, restaurant, automotive, horticulture).
3. Wire **templates** to WhatsApp/SMS.

---

If you’re unsure where to go, read `docs/KCOS-COMMERCE-PRIMITIVES.md` and build the first pattern workflow end-to-end.
