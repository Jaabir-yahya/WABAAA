from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.database.models import Tenant


class TenantService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tenant_id: str) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).first()

    def create(
        self,
        name: str,
        owner_phone: str,
        m_pesa_till: Optional[str] = None,
        whatsapp_business_phone: Optional[str] = None,
        sms_sender_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Tenant:
        tenant = Tenant(
            name=name,
            owner_phone=owner_phone,
            m_pesa_till=m_pesa_till,
            whatsapp_business_phone=whatsapp_business_phone,
            sms_sender_id=sms_sender_id,
            config=config,
            trial_ends_at=datetime.utcnow() + timedelta(days=30),
        )
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    def update(self, tenant: Tenant, updates: Dict[str, Any]) -> Tenant:
        for key, value in updates.items():
            setattr(tenant, key, value)
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        return tenant
