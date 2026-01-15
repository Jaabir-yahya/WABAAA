## ContainerX overview

ContainerX is a FastAPI backend that connects Africa's Talking APIs to Nairobi SME workflows, focusing on payments, messaging, and operational automation.

### Architecture summary
- FastAPI REST API with versioned routes
- PostgreSQL for core data storage
- SQLAlchemy + Alembic migrations
- Redis + Celery for background tasks
- Docker for local dev and deployment parity
- Africa's Talking for SMS + M-Pesa (WhatsApp is out of scope)

### Core data model
- `tenants`: SME accounts and configuration
- `customers`: SME customers and contact data
- `invoices`: payment requests and statuses
- `payment_intents`: M-Pesa transaction lifecycle
- `workflow_instances`: workflow execution tracking
- `messages`: outbound/inbound communications
- `usage_records`: billing usage aggregation
- `tenant_api_keys`: external integration keys

### Key endpoints
- `GET /health`: service health
- `POST /api/v1/tenants`: create tenant
- `GET /api/v1/tenants/{tenant_id}`: fetch tenant
- `POST /api/v1/invoices`: create invoice
- `POST /api/v1/webhooks/mpesa/callback`: M-Pesa callback

### Payment receipt flow (current)
1. M-Pesa callback confirms payment intent.
2. Invoice is marked paid and customer balance updates.
3. SMS receipt sent to the customer.
4. SMS alert sent to the SME owner.
5. Messages and usage records are logged.

### Environment variables
- `DATABASE_URL`: Postgres connection string
- `REDIS_URL`: Redis connection string
- `AT_USERNAME`: Africa's Talking username (sandbox: `sandbox`)
- `AT_API_KEY`: Africa's Talking API key
- `AT_WEBHOOK_SECRET`: webhook signature secret (if enabled)
- `ENVIRONMENT`: `development` or `production`
- `SECRET_KEY`: application secret

### Africa's Talking sandbox test
This project uses a lightweight connectivity test against the sandbox **Application/User balance** endpoint.

Run:
```
python containerx/backend/src/africastalking_sandbox_test.py
```

Required env vars:
- `AT_USERNAME=sandbox`
- `AT_API_KEY=...`

### Next actions checklist
- [ ] Create `.env` for ContainerX with the variables above.
- [ ] Start services: `docker-compose -f containerx/infrastructure/docker-compose.yml up --build`.
- [ ] Confirm Alembic migrations ran on startup.
- [ ] Run the Africa's Talking sandbox connectivity test.
- [ ] Trigger the payment receipt workflow via the M-Pesa callback endpoint.
