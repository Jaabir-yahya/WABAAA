# KCOS UML Diagrams

**Kenya Commerce OS - Architecture & Planning Diagrams**

This folder contains Mermaid diagrams that document the KCOS architecture for planning workflow replications and foreign integrations.

## Quick Navigation

| # | Diagram | Purpose |
|---|---------|---------|
| 01 | [System Architecture](./01-system-architecture.md) | High-level view of KCOS components |
| 02 | [Lego Architecture](./02-lego-architecture.md) | Actions, Workflows, and composability |
| 03 | [Action Registry](./03-action-registry.md) | All available actions by category |
| 04 | [Workflow Execution](./04-workflow-execution.md) | How workflows execute step-by-step |
| 05 | [Data Architecture](./05-data-architecture.md) | Event sourcing & projections |
| 06 | [Integration Patterns](./06-integration-patterns.md) | How to connect external systems |
| 07 | [Multi-Tenant Model](./07-multi-tenant.md) | Business isolation & RLS |
| 08 | [Trigger Catalog](./08-trigger-catalog.md) | All workflow entry points |
| 09 | [Example Workflows](./09-example-workflows.md) | Real workflow patterns |
| 10 | [Kenya Context](./10-kenya-context.md) | Kenya-specific considerations |

## How to Use These Diagrams

### For Planning New Workflows
1. Start with [Trigger Catalog](./08-trigger-catalog.md) - what starts your workflow?
2. Check [Action Registry](./03-action-registry.md) - what actions do you need?
3. Review [Example Workflows](./09-example-workflows.md) - similar patterns
4. Study [Workflow Execution](./04-workflow-execution.md) - understand the flow

### For Foreign Integrations
1. Read [Integration Patterns](./06-integration-patterns.md) - connection strategies
2. Check [Data Architecture](./05-data-architecture.md) - data flow
3. Review [Multi-Tenant Model](./07-multi-tenant.md) - isolation model

### For System Understanding
1. Start with [System Architecture](./01-system-architecture.md) - the big picture
2. Deep dive into [Lego Architecture](./02-lego-architecture.md) - composability model

## Rendering Diagrams

All diagrams use Mermaid syntax. They render automatically in:
- GitHub/GitLab README viewers
- VS Code with Mermaid extension
- Any Mermaid-compatible viewer

---

*Last updated: January 17, 2026*
