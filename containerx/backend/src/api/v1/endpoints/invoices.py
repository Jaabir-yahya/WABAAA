from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import get_current_tenant
from src.api.v1.schemas.invoice import InvoiceCreate, InvoiceResponse
from src.database.models import PaymentIntent, Tenant
from src.database.session import get_db
from src.domains.customers.services import CustomerService
from src.domains.invoices.services import InvoiceService


router = APIRouter()

@router.post("/", response_model=InvoiceResponse)
def create_invoice(
    invoice_data: InvoiceCreate,
    trigger_payment: bool = Query(default=False),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    customer_service = CustomerService(db)
    invoice_service = InvoiceService(db)

    customer = customer_service.get_or_create(
        tenant_id=str(current_tenant.id),
        phone=invoice_data.customer_phone,
        name=invoice_data.customer_name,
    )

    invoice = invoice_service.create(
        tenant_id=str(current_tenant.id),
        customer_id=str(customer.id),
        amount_kes=invoice_data.amount_kes,
        description=invoice_data.description,
        due_date=invoice_data.due_date,
        reference=invoice_data.reference,
    )

    if trigger_payment:
        payment_intent = PaymentIntent(
            tenant_id=current_tenant.id,
            invoice_id=invoice.id,
            customer_id=customer.id,
            amount_cents=invoice.amount_cents,
            phone_number=customer.normalized_phone,
            status="initiated",
        )
        db.add(payment_intent)

    db.commit()
    db.refresh(invoice)

    return invoice
