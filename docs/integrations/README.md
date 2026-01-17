# Integrations

**External system integrations for KCOS**

---

## Available Integrations

| Integration | Document | Status |
|-------------|----------|--------|
| **M-Pesa** | [[MPESA]] | ✅ Live |
| **WhatsApp** | [[WHATSAPP]] | ✅ Live |
| **SMS** | [[SMS]] | ✅ Live (Africa's Talking) |

---

## Integration Patterns

For detailed integration patterns and how to add new integrations, see:
- [[../diagrams/06-integration-patterns|Integration Patterns Diagram]]

---

## M-Pesa (Safaricom)

- **API**: Daraja API
- **Features**: STK Push, C2B, B2C
- **Actions**: `mpesa.initiate`, `mpesa.verify`

→ [[MPESA|Full M-Pesa Documentation]]

---

## WhatsApp (Meta)

- **API**: WhatsApp Business Cloud API
- **Features**: Text, templates, media
- **Actions**: `whatsapp.send`

→ [[WHATSAPP|Full WhatsApp Documentation]]

---

## SMS (Africa's Talking)

- **API**: Africa's Talking SMS
- **Features**: Outbound SMS, fallback
- **Actions**: `sms.send`

→ [[SMS|Full SMS Documentation]]

---

## Back to Main Docs

- [[../HOME|← Home]]
- [[../architecture/KCOS-DOCUMENTATION-INDEX|Architecture Docs]]

---

#kcos #integrations #mpesa #whatsapp #sms
