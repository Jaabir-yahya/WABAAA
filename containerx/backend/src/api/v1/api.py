from fastapi import APIRouter

from src.api.v1.endpoints import invoices, tenants, webhooks


api_router = APIRouter()
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
