# Clients

**Client-specific documentation**

---

## Active Clients

| Client | Industry | Status |
|--------|----------|--------|
| [[ELIXOSENSE]] | Mini Supermarket | 🟢 Active |

---

## ElixoSense

First KCOS client - mini supermarket in Nairobi.

**Features**:
- WhatsApp ordering
- M-Pesa payments
- Merchant dashboard

**Workflow**: `workflows/elixosense/order-flow.yaml`

→ [[ELIXOSENSE|Full ElixoSense Documentation]]

---

## Adding New Clients

1. Create client config in `clients/` folder
2. Define workflows in `workflows/{client}/`
3. Configure tenant in database
4. Set up integrations (WhatsApp, M-Pesa)

---

## Back to Main Docs

- [[../HOME|← Home]]

---

#kcos #clients #elixosense
