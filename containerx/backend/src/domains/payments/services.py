from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.database.models import Customer, Invoice, PaymentIntent


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_checkout_request(self, checkout_request_id: str) -> PaymentIntent | None:
        return (
            self.db.query(PaymentIntent)
            .filter(PaymentIntent.checkout_request_id == checkout_request_id)
            .first()
        )

    def confirm_payment(
        self,
        payment_intent: PaymentIntent,
        transaction_id: str,
        receipt_number: Optional[str],
        payload: Dict[str, Any],
    ) -> PaymentIntent:
        if payment_intent.status == "confirmed":
            return payment_intent

        payment_intent.status = "confirmed"
        payment_intent.m_pesa_transaction_id = transaction_id
        payment_intent.m_pesa_receipt_number = receipt_number
        payment_intent.callback_received = True
        payment_intent.callback_payload = payload
        payment_intent.result_code = payload.get("resultCode")

        if payment_intent.invoice:
            invoice: Invoice = payment_intent.invoice
            invoice.status = "paid"
            invoice.paid_at = datetime.utcnow()
            invoice.m_pesa_transaction_id = transaction_id
            invoice.payment_method = "m_pesa"

            customer: Customer = invoice.customer
            customer.balance_cents = max(0, customer.balance_cents - invoice.amount_cents)
            customer.last_payment_date = datetime.utcnow()

        self.db.add(payment_intent)
        self.db.commit()
        self.db.refresh(payment_intent)
        return payment_intent

    def mark_failed(self, payment_intent: PaymentIntent, payload: Dict[str, Any]) -> PaymentIntent:
        payment_intent.status = "failed"
        payment_intent.callback_received = True
        payment_intent.callback_payload = payload
        payment_intent.result_code = payload.get("resultCode")
        payment_intent.result_description = payload.get("resultDesc")
        self.db.add(payment_intent)
        self.db.commit()
        self.db.refresh(payment_intent)
        return payment_intent

    def mark_cancelled(self, payment_intent: PaymentIntent, payload: Dict[str, Any]) -> PaymentIntent:
        payment_intent.status = "cancelled"
        payment_intent.callback_received = True
        payment_intent.callback_payload = payload
        self.db.add(payment_intent)
        self.db.commit()
        self.db.refresh(payment_intent)
        return payment_intent
