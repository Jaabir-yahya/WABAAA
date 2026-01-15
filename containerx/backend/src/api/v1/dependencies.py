from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from src.database.models import Tenant
from src.database.session import get_db


def get_current_tenant(
    db: Session = Depends(get_db),
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
):
    if not x_tenant_id:
        raise HTTPException(status_code=401, detail="Missing X-Tenant-Id header")

    tenant = db.query(Tenant).filter(Tenant.id == x_tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid tenant")
    return tenant
