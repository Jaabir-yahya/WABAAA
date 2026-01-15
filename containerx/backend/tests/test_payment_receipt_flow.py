import os
import uuid

import pytest
from fastapi import BackgroundTasks
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.v1.endpoints import webhooks
from src.config import settings
from src.database.models import Base, Customer, Invoice, Message, PaymentIntent, Tenant, UsageRecord
from src.integrations.africastalking import client as at_client_module


@pytest.mark.asyncio
async def test_payment_receipt_flow(monkeypatch):
    database_url = os.getenv("DATABASE_URL")
    if not database_url or not database_url.startswith("postgresql"):
        pytest.skip("DATABASE_URL must be set to a Postgres database for this test.")

    engine = create_engine(database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        tenant = Tenant(
            name="Test Tenant",
            owner_phone="+254700000001",
        )
        db.add(tenant)
        db.flush()

        customer = Customer(
            tenant_id=tenant.id,
            phone="+254700000002",
            normalized_phone="+254700000002",
        )
        db.add(customer)
        db.flush()

        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            reference=f"INV-{uuid.uuid4().hex[:6]}",
            amount_cents=5000,
        )
        db.add(invoice)
        db.flush()

        payment_intent = PaymentIntent(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            customer_id=customer.id,
            amount_cents=invoice.amount_cents,
            phone_number=customer.normalized_phone,
            status="initiated",
            checkout_request_id=f"chk_{uuid.uuid4().hex}",
        )
        db.add(payment_intent)
        db.commit()

        async def fake_send_sms(*args, **kwargs):
            return {"success": True, "response": {"SMSMessageData": {"Recipients": []}}}

        monkeypatch.setattr(settings, "at_username", "sandbox")
        monkeypatch.setattr(settings, "at_api_key", "dummy")
        monkeypatch.setattr(at_client_module.AfricaTalkingClient, "send_sms", fake_send_sms)
        monkeypatch.setattr(webhooks, "SessionLocal", SessionLocal)

        payload = {
            "transactionType": "PaymentReceived",
            "checkoutRequestID": payment_intent.checkout_request_id,
            "transactionId": "TX123",
            "providerRefId": "RCPT123",
            "resultCode": 0,
        }

        tasks = BackgroundTasks()
        result = await webhooks._handle_payment_received(payload, db, tasks)
        assert result["status"] == "processed"

        for task in tasks.tasks:
            await task()

        db.refresh(invoice)
        db.refresh(payment_intent)

        assert payment_intent.status == "confirmed"
        assert invoice.status == "paid"

        usage_record = (
            db.query(UsageRecord)
            .filter(UsageRecord.tenant_id == tenant.id)
            .first()
        )
        assert usage_record is not None
        assert usage_record.m_pesa_transactions >= 1
        assert usage_record.sms_messages >= 2

        message_count = db.query(Message).filter(Message.tenant_id == tenant.id).count()
        assert message_count >= 2
    finally:
        db.close()
