from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.v1.dependencies import get_current_tenant
from src.api.v1.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate
from src.database.models import Tenant
from src.database.session import get_db
from src.domains.tenants.services import TenantService


router = APIRouter()


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(tenant_data: TenantCreate, db: Session = Depends(get_db)):
    existing = db.query(Tenant).filter(Tenant.owner_phone == tenant_data.owner_phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Owner phone already registered")

    tenant_service = TenantService(db)
    return tenant_service.create(
        name=tenant_data.name,
        owner_phone=tenant_data.owner_phone,
        m_pesa_till=tenant_data.m_pesa_till,
        whatsapp_business_phone=tenant_data.whatsapp_business_phone,
        sms_sender_id=tenant_data.sms_sender_id,
        config=tenant_data.config,
    )


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    if str(current_tenant.id) != tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    if str(current_tenant.id) != tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = tenant_data.model_dump(exclude_unset=True)
    tenant_service = TenantService(db)
    return tenant_service.update(tenant, update_data)
