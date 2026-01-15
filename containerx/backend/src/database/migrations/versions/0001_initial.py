"""Initial ContainerX schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("owner_phone", sa.String(length=20), nullable=False, unique=True),
        sa.Column("m_pesa_till", sa.String(length=20)),
        sa.Column("whatsapp_business_phone", sa.String(length=20)),
        sa.Column("sms_sender_id", sa.String(length=11)),
        sa.Column("status", sa.String(length=20), server_default="trial"),
        sa.Column("config", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("normalized_phone", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=200)),
        sa.Column("email", sa.String(length=255)),
        sa.Column("location_code", sa.String(length=10)),
        sa.Column("segment", sa.String(length=20), server_default="regular"),
        sa.Column("balance_cents", sa.Integer(), server_default="0"),
        sa.Column("credit_limit_cents", sa.Integer(), server_default="0"),
        sa.Column("last_payment_date", sa.DateTime(timezone=True)),
        sa.Column("contact_preferences", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "normalized_phone", name="uq_customers_tenant_phone"),
    )

    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("reference", sa.String(length=50), nullable=False),
        sa.Column("external_reference", sa.String(length=100)),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", sa.String(length=20), server_default="pending"),
        sa.Column("due_date", sa.Date()),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("payment_method", sa.String(length=20)),
        sa.Column("m_pesa_transaction_id", sa.String(length=50)),
        sa.Column("workflows_triggered", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column("metadata", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "payment_intents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id")),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="initiated"),
        sa.Column("stk_request_id", sa.String(length=100)),
        sa.Column("m_pesa_receipt_number", sa.String(length=50)),
        sa.Column("m_pesa_transaction_id", sa.String(length=50)),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("checkout_request_id", sa.String(length=100)),
        sa.Column("result_code", sa.Integer()),
        sa.Column("result_description", sa.Text()),
        sa.Column("merchant_request_id", sa.String(length=100)),
        sa.Column("callback_received", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("callback_payload", postgresql.JSONB()),
        sa.Column("retry_count", sa.Integer(), server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "workflow_instances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("workflow_type", sa.String(length=50), nullable=False),
        sa.Column("trigger_event", sa.String(length=50), nullable=False),
        sa.Column("trigger_data", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="running"),
        sa.Column("steps", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column("error_message", sa.Text()),
        sa.Column("retry_count", sa.Integer(), server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id")),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text()),
        sa.Column("template_name", sa.String(length=100)),
        sa.Column("media_url", sa.Text()),
        sa.Column("status", sa.String(length=20), server_default="sent"),
        sa.Column("external_message_id", sa.String(length=100)),
        sa.Column("cost_cents", sa.Integer(), server_default="0"),
        sa.Column("workflow_instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_instances.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "usage_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("whatsapp_messages", sa.Integer(), server_default="0"),
        sa.Column("sms_messages", sa.Integer(), server_default="0"),
        sa.Column("ussd_sessions", sa.Integer(), server_default="0"),
        sa.Column("voice_minutes", sa.Integer(), server_default="0"),
        sa.Column("m_pesa_transactions", sa.Integer(), server_default="0"),
        sa.Column("total_cost_cents", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "date", name="uq_usage_records_tenant_date"),
    )

    op.create_table(
        "tenant_api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("api_key", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("webhook_url", sa.Text()),
        sa.Column("webhook_secret", sa.String(length=100)),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_index("idx_customers_tenant_phone", "customers", ["tenant_id", "normalized_phone"])
    op.create_index("idx_invoices_status_due", "invoices", ["status", "due_date"])
    op.create_index("idx_payment_intents_status", "payment_intents", ["status", "expires_at"])
    op.create_index("idx_workflows_tenant_status", "workflow_instances", ["tenant_id", "status"])
    op.create_index("idx_messages_created", "messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_messages_created", table_name="messages")
    op.drop_index("idx_workflows_tenant_status", table_name="workflow_instances")
    op.drop_index("idx_payment_intents_status", table_name="payment_intents")
    op.drop_index("idx_invoices_status_due", table_name="invoices")
    op.drop_index("idx_customers_tenant_phone", table_name="customers")

    op.drop_table("tenant_api_keys")
    op.drop_table("usage_records")
    op.drop_table("messages")
    op.drop_table("workflow_instances")
    op.drop_table("payment_intents")
    op.drop_table("invoices")
    op.drop_table("customers")
    op.drop_table("tenants")
