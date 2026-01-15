from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from src.api.v1.api import api_router
from src.config import settings
from src.database.models import Base
from src.database.session import engine


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ContainerX Backend...")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down ContainerX Backend...")


app = FastAPI(
    title="ContainerX API",
    description="Universal Adapter Between Global SaaS and Kenyan Workflows",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ContainerX Backend",
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/nairobi/time")
async def nairobi_time():
    import pytz

    nairobi_tz = pytz.timezone("Africa/Nairobi")
    nairobi_now = datetime.now(nairobi_tz)
    return {
        "nairobi_time": nairobi_now.strftime("%Y-%m-%d %H:%M:%S"),
        "timezone": "Africa/Nairobi",
        "is_business_hours": 8 <= nairobi_now.hour <= 20,
        "day_of_week": nairobi_now.strftime("%A"),
    }
