from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from src.database.models import Customer


def normalize_phone(phone: str) -> str:
    cleaned = "".join(filter(str.isdigit, phone))
    if cleaned.startswith("0"):
        return f"+254{cleaned[1:]}"
    if cleaned.startswith("254"):
        return f"+{cleaned}"
    if cleaned.startswith("7"):
        return f"+254{cleaned}"
    return phone if phone.startswith("+") else f"+{cleaned}"


class CustomerService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_phone(self, tenant_id: str, phone: str) -> Customer | None:
        normalized = normalize_phone(phone)
        return (
            self.db.query(Customer)
            .filter(Customer.tenant_id == tenant_id, Customer.normalized_phone == normalized)
            .first()
        )

    def get_or_create(
        self,
        tenant_id: str,
        phone: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Customer:
        normalized = normalize_phone(phone)
        customer = (
            self.db.query(Customer)
            .filter(Customer.tenant_id == tenant_id, Customer.normalized_phone == normalized)
            .first()
        )
        if customer:
            if name and not customer.name:
                customer.name = name
            if email and not customer.email:
                customer.email = email
            self.db.add(customer)
            self.db.commit()
            self.db.refresh(customer)
            return customer

        customer = Customer(
            tenant_id=tenant_id,
            phone=phone,
            normalized_phone=normalized,
            name=name,
            email=email,
        )
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer
