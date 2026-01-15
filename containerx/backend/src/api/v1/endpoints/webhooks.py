from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.config import settings
from src.billing.usage_tracker import UsageTracker
from src.database.models import PaymentIntent
from src.database.session import SessionLocal, get_db
from src.domains.payments.services import PaymentService
from src.workflows.engine import WorkflowEngine


logger = logging.getLogger(__name__)
router = APIRouter()


def verify_signature(payload_bytes: bytes, signature: str | None) -> bool:
    if not settings.at_webhook_secret:
        return True
    if not signature:
        return False
    digest = hmac.new(
        settings.at_webhook_secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, signature)


@router.post("/mpesa/callback")
async def handle_mpesa_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    payload_bytes = await request.body()
    payload = json.loads(payload_bytes.decode("utf-8"))

    signature = request.headers.get("X-Africastalking-Signature")
    if not verify_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    transaction_type = payload.get("transactionType", "")

    if transaction_type == "PaymentReceived":
        return await _handle_payment_received(payload, db, background_tasks)
    if transaction_type == "PaymentFailed":
        return await _handle_payment_failed(payload, db)
    if transaction_type == "PaymentCancelled":
        return await _handle_payment_cancelled(payload, db)

    logger.info("Ignoring transaction type %s", transaction_type)
    return {"status": "ignored", "reason": f"Unknown type: {transaction_type}"}


async def _handle_payment_received(
    payload: Dict[str, Any],
    db: Session,
    background_tasks: BackgroundTasks,
):
    checkout_request_id = payload.get("checkoutRequestID")
    transaction_id = payload.get("transactionId")
    receipt_number = payload.get("providerRefId")

    payment_service = PaymentService(db)
    usage_tracker = UsageTracker(db)

    payment_intent = payment_service.get_by_checkout_request(checkout_request_id)
    if not payment_intent:
        logger.warning("Payment intent not found for checkout %s", checkout_request_id)
        return {"status": "not_found"}

    if payment_intent.status == "confirmed":
        logger.warning("Duplicate callback for checkout %s", checkout_request_id)
        return {"status": "duplicate"}

    payment_intent = payment_service.confirm_payment(
        payment_intent=payment_intent,
        transaction_id=transaction_id,
        receipt_number=receipt_number,
        payload=payload,
    )

    usage_tracker.increment_mpesa(str(payment_intent.tenant_id), count=1)

    background_tasks.add_task(
        _trigger_payment_receipt_workflow,
        str(payment_intent.id),
        str(payment_intent.tenant_id),
        str(payment_intent.invoice_id) if payment_intent.invoice_id else None,
    )

    return {"status": "processed", "payment_intent_id": str(payment_intent.id)}


async def _handle_payment_failed(payload: Dict[str, Any], db: Session):
    checkout_request_id = payload.get("checkoutRequestID")
    payment_service = PaymentService(db)
    payment_intent = payment_service.get_by_checkout_request(checkout_request_id)
    if not payment_intent:
        return {"status": "not_found"}

    payment_service.mark_failed(payment_intent, payload)
    return {"status": "failed"}


async def _handle_payment_cancelled(payload: Dict[str, Any], db: Session):
    checkout_request_id = payload.get("checkoutRequestID")
    payment_service = PaymentService(db)
    payment_intent = payment_service.get_by_checkout_request(checkout_request_id)
    if not payment_intent:
        return {"status": "not_found"}
    payment_service.mark_cancelled(payment_intent, payload)
    return {"status": "cancelled"}


async def _trigger_payment_receipt_workflow(
    payment_intent_id: str,
    tenant_id: str,
    invoice_id: str | None,
):
    db = SessionLocal()
    try:
        engine = WorkflowEngine(db)
        await engine.trigger_workflow(
            tenant_id=tenant_id,
            workflow_type="payment_receipt",
            trigger_event="payment_confirmed",
            trigger_data={
                "payment_intent_id": payment_intent_id,
                "invoice_id": invoice_id,
            },
        )
    except Exception as exc:
        logger.exception("Workflow trigger failed: %s", exc)
    finally:
        db.close()
