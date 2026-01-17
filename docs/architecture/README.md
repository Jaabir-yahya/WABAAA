# KCOS Architecture Documentation

**Kenya Commerce OS - Architecture & Specifications**

---

## Documents in This Folder

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [[KCOS-LEGO-ARCHITECTURE]] | Core philosophy - Lego blocks model | 30 min |
| [[KCOS-COMMERCE-PRIMITIVES]] | Universal commerce patterns | 30 min |
| [[KCOS-ACTION-SPECIFICATION]] | Action interface & all action definitions | 45 min |
| [[KCOS-WORKFLOW-SPECIFICATION]] | Workflow YAML format & examples | 45 min |
| [[KCOS-QUICK-START]] | 3-day hands-on implementation guide | 15 min |
| [[KCOS-IMPLEMENTATION-PLAN]] | 6-week phased plan | 30 min |
| [[KCOS-ARCHITECTURE-VALIDATION]] | Research validation & refinements | 30 min |
| [[KCOS-RESEARCH-IMPLEMENTATION-GUIDE]] | Industry patterns & Kenya adaptations | 45 min |
| [[KCOS-INDUSTRY-WORKFLOW-GUIDE]] | Shopify, Stripe, Amazon patterns | 60 min |
| [[KCOS-VISION-AND-FUTURE]] | Long-term vision | 15 min |
| [[QR_IMPLEMENTATION]] | QR code implementation details | 20 min |
| [[ROADMAP]] | Product roadmap | 15 min |

---

## Reading Order

### For Understanding
1. **[[KCOS-LEGO-ARCHITECTURE]]** - The mental model
2. **[[KCOS-COMMERCE-PRIMITIVES]]** - Universal patterns
3. **[[KCOS-ARCHITECTURE-VALIDATION]]** - Research backing

### For Building
4. **[[KCOS-ACTION-SPECIFICATION]]** - Create actions
5. **[[KCOS-WORKFLOW-SPECIFICATION]]** - Define workflows
6. **[[KCOS-QUICK-START]]** - Start coding

### For Planning
7. **[[KCOS-IMPLEMENTATION-PLAN]]** - Week-by-week
8. **[[KCOS-INDUSTRY-WORKFLOW-GUIDE]]** - Copy from big companies
9. **[[ROADMAP]]** - Future direction

---

## Key Concepts

| Term | Definition | Document |
|------|------------|----------|
| **Action** | Atomic operation | [[KCOS-ACTION-SPECIFICATION]] |
| **Workflow** | Sequence of actions | [[KCOS-WORKFLOW-SPECIFICATION]] |
| **Trigger** | Event that starts workflow | [[KCOS-WORKFLOW-SPECIFICATION#Triggers]] |
| **ActionRegistry** | Catalog of actions | [[KCOS-LEGO-ARCHITECTURE]] |
| **WorkflowEngine** | Executes workflows | [[KCOS-LEGO-ARCHITECTURE]] |
| **Compensation** | Saga rollback | [[KCOS-ARCHITECTURE-VALIDATION]] |
| **Idempotency** | Safe retries | [[KCOS-ARCHITECTURE-VALIDATION]] |

---

## Related Folders

- **[[../diagrams/00-README|diagrams/]]** - Visual UML diagrams
- **[[../integrations/|integrations/]]** - M-Pesa, WhatsApp, SMS
- **[[../flows/|flows/]]** - Business-specific flows
- **[[../database/SCHEMA|database/]]** - Schema documentation
- **[[../state-machines/|state-machines/]]** - Order & payment states

---

#kcos #architecture #documentation
