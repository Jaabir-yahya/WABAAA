from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}


class Tenant(BaseModel):
    __tablename__ = "tenants"

    name = Column(String(200), nullable=False)
    owner_phone = Column(String(20), unique=True, nullable=False)
    m_pesa_till = Column(String(20))
    whatsapp_business_phone = Column(String(20))
    sms_sender_id = Column(String(11))
    status = Column(String(20), default="trial")
    config = Column(
        JSONB,
        default=lambda: {
            "language": "sw",
            "timezone": "Africa/Nairobi",
            "workflows_enabled": ["payment_receipt"],
            "fallback_channel": "sms",
            "dual_sim_handling": "primary_first",
        },
    )
    trial_ends_at = Column(DateTime(timezone=True))

    customers = relationship("Customer", back_populates="tenant", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="tenant", cascade="all, delete-orphan")
    payment_intents = relationship("PaymentIntent", back_populates="tenant", cascade="all, delete-orphan")
    workflow_instances = relationship(
        "WorkflowInstance", back_populates="tenant", cascade="all, delete-orphan"
    )
    messages = relationship("Message", back_populates="tenant", cascade="all, delete-orphan")
    usage_records = relationship(
        "UsageRecord", back_populates="tenant", cascade="all, delete-orphan"
    )
    api_keys = relationship("TenantApiKey", back_populates="tenant", cascade="all, delete-orphan")


class Customer(BaseModel):
    __tablename__ = "customers"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    phone = Column(String(20), nullable=False)
    normalized_phone = Column(String(20), nullable=False)
    name = Column(String(200))
    email = Column(String(255))
    location_code = Column(String(10))
    segment = Column(String(20), default="regular")
    balance_cents = Column(Integer, default=0)
    credit_limit_cents = Column(Integer, default=0)
    last_payment_date = Column(DateTime(timezone=True))
    contact_preferences = Column(
        JSONB,
        default=lambda: {
            "whatsapp": True,
            "sms": True,
            "voice": False,
            "language": "sw",
            "dual_sim": {"safaricom": None, "airtel": None},
        },
    )
    metadata = Column(JSONB, default=lambda: {})

    tenant = relationship("Tenant", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    payment_intents = relationship(
        "PaymentIntent", back_populates="customer", cascade="all, delete-orphan"
    )

    @property
    def balance_kes(self) -> float:
        return self.balance_cents / 100

    @balance_kes.setter
    def balance_kes(self, value: float) -> None:
        self.balance_cents = int(value * 100)


class Invoice(BaseModel):
    __tablename__ = "invoices"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    reference = Column(String(50), nullable=False)
    external_reference = Column(String(100))
    amount_cents = Column(Integer, nullable=False)
    description = Column(Text)
    status = Column(String(20), default="pending")
    due_date = Column(Date)
    paid_at = Column(DateTime(timezone=True))
    payment_method = Column(String(20))
    m_pesa_transaction_id = Column(String(50))
    workflows_triggered = Column(JSONB, default=list)
    metadata = Column(JSONB, default=lambda: {})

    tenant = relationship("Tenant", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    payment_intents = relationship(
        "PaymentIntent", back_populates="invoice", cascade="all, delete-orphan"
    )

    @property
    def is_overdue(self) -> bool:
        if self.status == "pending" and self.due_date:
            return date.today() > self.due_date
        return False


class PaymentIntent(BaseModel):
    __tablename__ = "payment_intents"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    status = Column(String(30), default="initiated")
    stk_request_id = Column(String(100))
    m_pesa_receipt_number = Column(String(50))
    m_pesa_transaction_id = Column(String(50))
    phone_number = Column(String(20), nullable=False)
    checkout_request_id = Column(String(100))
    result_code = Column(Integer)
    result_description = Column(Text)
    merchant_request_id = Column(String(100))
    callback_received = Column(Boolean, default=False)
    callback_payload = Column(JSONB)
    retry_count = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True))

    tenant = relationship("Tenant", back_populates="payment_intents")
    customer = relationship("Customer", back_populates="payment_intents")
    invoice = relationship("Invoice", back_populates="payment_intents")


class WorkflowInstance(BaseModel):
    __tablename__ = "workflow_instances"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    workflow_type = Column(String(50), nullable=False)
    trigger_event = Column(String(50), nullable=False)
    trigger_data = Column(JSONB, nullable=False)
    status = Column(String(20), default="running")
    steps = Column(JSONB, default=list)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True))

    tenant = relationship("Tenant", back_populates="workflow_instances")


class Message(BaseModel):
    __tablename__ = "messages"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    channel = Column(String(20), nullable=False)
    direction = Column(String(10), nullable=False)
    phone_number = Column(String(20), nullable=False)
    content = Column(Text)
    template_name = Column(String(100))
    media_url = Column(Text)
    status = Column(String(20), default="sent")
    external_message_id = Column(String(100))
    cost_cents = Column(Integer, default=0)
    workflow_instance_id = Column(UUID(as_uuid=True), ForeignKey("workflow_instances.id"))

    tenant = relationship("Tenant", back_populates="messages")
    customer = relationship("Customer")


class UsageRecord(BaseModel):
    __tablename__ = "usage_records"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    date = Column(Date, nullable=False)
    whatsapp_messages = Column(Integer, default=0)
    sms_messages = Column(Integer, default=0)
    ussd_sessions = Column(Integer, default=0)
    voice_minutes = Column(Integer, default=0)
    m_pesa_transactions = Column(Integer, default=0)
    total_cost_cents = Column(Integer, default=0)

    tenant = relationship("Tenant", back_populates="usage_records")


class TenantApiKey(BaseModel):
    __tablename__ = "tenant_api_keys"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    api_key = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    webhook_url = Column(Text)
    webhook_secret = Column(String(100))
    enabled = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="api_keys")
