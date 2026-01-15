from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict

from sqlalchemy.orm import Session

from src.billing.usage_tracker import UsageTracker
from src.database.models import Customer, Invoice, PaymentIntent, Tenant
from src.domains.messages.services import MessageService
from src.config import settings
from src.integrations.africastalking.client import AfricaTalkingClient
from src.workflows.base import BaseWorkflow, WorkflowStep


logger = logging.getLogger(__name__)


class PaymentReceiptWorkflow(BaseWorkflow):
    def __init__(self, workflow_instance_id: str, db_session: Session, tenant_config: Dict[str, Any]):
        super().__init__(workflow_instance_id, db_session, tenant_config)
        self.steps = {
            "validate_payment": WorkflowStep("validate_payment", self._validate_payment, retry_count=2),
            "send_sms_receipt": WorkflowStep("send_sms_receipt", self._send_sms_receipt, retry_count=3),
            "notify_owner": WorkflowStep("notify_owner", self._notify_owner, retry_count=2),
            "update_records": WorkflowStep("update_records", self._update_records, retry_count=3),
        }

    async def _validate_payment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        payment_intent_id = context.get("payment_intent_id")
        payment_intent = (
            self.db.query(PaymentIntent).filter(PaymentIntent.id == payment_intent_id).first()
        )
        if not payment_intent:
            raise ValueError("Payment intent not found")
        if payment_intent.status != "confirmed":
            raise ValueError(f"Payment not confirmed: {payment_intent.status}")

        invoice = payment_intent.invoice
        if invoice and invoice.status == "paid":
            logger.info("Invoice %s already marked as paid", invoice.id)

        return {
            "invoice_id": str(invoice.id) if invoice else None,
            "customer_id": str(payment_intent.customer_id),
            "amount_kes": payment_intent.amount_cents / 100,
            "customer_phone": payment_intent.phone_number,
            "receipt_number": payment_intent.m_pesa_receipt_number,
        }

    async def _send_sms_receipt(self, context: Dict[str, Any]) -> Dict[str, Any]:
        tenant = self._get_tenant()
        if not tenant:
            raise ValueError("Tenant not found")

        at_client = AfricaTalkingClient(settings.at_username, settings.at_api_key)
        message = (
            f"Ahsante! Umelipa KES {context['amount_kes']:,.2f}. "
            f"Risiti: {context.get('receipt_number') or 'N/A'}."
        )
        response = await at_client.send_sms(
            phone_numbers=[context["customer_phone"]],
            message=message,
            sender_id=tenant.sms_sender_id or "CONTAINERX",
        )
        if response.get("success"):
            MessageService(self.db).log_outbound(
                tenant_id=str(tenant.id),
                customer_id=context.get("customer_id"),
                phone_number=context["customer_phone"],
                channel="sms",
                content=message,
                workflow_instance_id=self.workflow_instance_id,
            )
            UsageTracker(self.db).increment_sms(str(tenant.id), count=1)
        return response

    async def _notify_owner(self, context: Dict[str, Any]) -> Dict[str, Any]:
        tenant = self._get_tenant()
        if not tenant:
            raise ValueError("Tenant not found")

        at_client = AfricaTalkingClient(settings.at_username, settings.at_api_key)
        message = (
            f"Malipo yamepokelewa: KES {context['amount_kes']:,.2f}. "
            f"Risiti: {context.get('receipt_number') or 'N/A'}."
        )
        response = await at_client.send_sms(
            phone_numbers=[tenant.owner_phone],
            message=message,
            sender_id=tenant.sms_sender_id or "CONTAINERX",
        )
        if response.get("success"):
            MessageService(self.db).log_outbound(
                tenant_id=str(tenant.id),
                phone_number=tenant.owner_phone,
                channel="sms",
                content=message,
                workflow_instance_id=self.workflow_instance_id,
            )
            UsageTracker(self.db).increment_sms(str(tenant.id), count=1)
        return response

    async def _update_records(self, context: Dict[str, Any]) -> Dict[str, Any]:
        invoice_id = context.get("invoice_id")
        customer_id = context.get("customer_id")

        if invoice_id:
            invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice:
                metadata = invoice.metadata or {}
                metadata["receipt_sent_at"] = datetime.utcnow().isoformat()
                metadata["workflow_completed"] = True
                invoice.metadata = metadata
                self.db.add(invoice)

        if customer_id:
            customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                metadata = customer.metadata or {}
                metadata["loyalty_points"] = metadata.get("loyalty_points", 0) + int(
                    context["amount_kes"] / 10
                )
                customer.metadata = metadata
                self.db.add(customer)

        self.db.commit()
        return {"records_updated": True}

    async def _on_complete(self) -> Dict[str, Any]:
        return {
            "status": "success",
            "message": "Payment receipt workflow completed",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _handle_step_failure(self, step_name: str, error: Exception):
        logger.error("Workflow step %s failed: %s", step_name, error)

    def _get_tenant(self) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.id == self.tenant_config.get("tenant_id")).first()
