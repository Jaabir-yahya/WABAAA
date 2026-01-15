from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class TenantCreate(BaseModel):
    name: str
    owner_phone: str
    m_pesa_till: Optional[str] = None
    whatsapp_business_phone: Optional[str] = None
    sms_sender_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    owner_phone: Optional[str] = None
    m_pesa_till: Optional[str] = None
    whatsapp_business_phone: Optional[str] = None
    sms_sender_id: Optional[str] = None
    status: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    owner_phone: str
    m_pesa_till: Optional[str] = None
    whatsapp_business_phone: Optional[str] = None
    sms_sender_id: Optional[str] = None
    status: str
    config: Dict[str, Any] = Field(default_factory=dict)
    trial_ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True
