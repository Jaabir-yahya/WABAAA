from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class InvoiceCreate(BaseModel):
    customer_phone: str
    customer_name: Optional[str] = None
    reference: Optional[str] = None
    amount_kes: float
    description: Optional[str] = None
    due_date: Optional[date] = None


class InvoiceResponse(BaseModel):
    id: str
    tenant_id: str
    customer_id: str
    reference: str
    amount_cents: int
    description: Optional[str] = None
    status: str
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True
