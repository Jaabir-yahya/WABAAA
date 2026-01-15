from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from src.database.models import Invoice


def generate_reference() -> str:
    short_id = uuid.uuid4().hex[:6].upper()
    return f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{short_id}"


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        tenant_id: str,
        customer_id: str,
        amount_kes: float,
        description: Optional[str] = None,
        due_date: Optional[datetime] = None,
        reference: Optional[str] = None,
    ) -> Invoice:
        invoice = Invoice(
            tenant_id=tenant_id,
            customer_id=customer_id,
            reference=reference or generate_reference(),
            amount_cents=int(amount_kes * 100),
            description=description,
            due_date=due_date,
        )
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def mark_paid(self, invoice: Invoice, transaction_id: str) -> Invoice:
        invoice.status = "paid"
        invoice.paid_at = datetime.utcnow()
        invoice.m_pesa_transaction_id = transaction_id
        invoice.payment_method = "m_pesa"
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
