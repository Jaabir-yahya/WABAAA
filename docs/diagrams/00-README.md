# KCOS Diagrams

**Visual documentation for Kenya Commerce OS**

All diagrams use **Mermaid** syntax - they render automatically in Obsidian, GitHub, and VS Code.

---

## Diagram Index

| # | Diagram | Purpose |
|---|---------|---------|
| 01 | [[01-system-architecture]] | High-level KCOS components |
| 02 | [[02-lego-architecture]] | Actions, Workflows, composability |
| 03 | [[03-action-registry]] | All available actions by category |
| 04 | [[04-workflow-execution]] | Step-by-step execution flow |
| 05 | [[05-data-architecture]] | Event sourcing & projections |
| 06 | [[06-integration-patterns]] | How to connect external systems |
| 07 | [[07-multi-tenant]] | Business isolation & RLS |
| 08 | [[08-trigger-catalog]] | All workflow entry points |
| 09 | [[09-example-workflows]] | Reusable workflow patterns |
| 10 | [[10-kenya-context]] | Kenya-specific considerations |

---

## How to Use

### For Planning New Workflows
1. [[08-trigger-catalog]] - What starts your workflow?
2. [[03-action-registry]] - What actions do you need?
3. [[09-example-workflows]] - Similar patterns to copy
4. [[04-workflow-execution]] - Understand the flow

### For Foreign Integrations
1. [[06-integration-patterns]] - Connection strategies
2. [[05-data-architecture]] - Data flow
3. [[07-multi-tenant]] - Isolation model

### For System Understanding
1. [[01-system-architecture]] - The big picture
2. [[02-lego-architecture]] - Composability model

---

## Diagram Categories

### Architecture
- [[01-system-architecture]] - Components & flow
- [[02-lego-architecture]] - Design philosophy
- [[05-data-architecture]] - Database & events
- [[07-multi-tenant]] - Tenant isolation

### Reference
- [[03-action-registry]] - All actions
- [[08-trigger-catalog]] - All triggers

### Execution
- [[04-workflow-execution]] - How workflows run
- [[09-example-workflows]] - Patterns to copy

### Context
- [[06-integration-patterns]] - External systems
- [[10-kenya-context]] - Kenya specifics

---

## Back to Main Docs

- [[../HOME|← Home]]
- [[../architecture/KCOS-DOCUMENTATION-INDEX|Architecture Docs]]

---

#kcos #diagrams #uml #mermaid
