from __future__ import annotations

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(
        default="postgresql://containerx:containerx123@localhost:5432/containerx_db",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    at_username: str | None = Field(default=None, alias="AT_USERNAME")
    at_api_key: str | None = Field(default=None, alias="AT_API_KEY")
    at_webhook_secret: str | None = Field(default=None, alias="AT_WEBHOOK_SECRET")

    secret_key: str = Field(default="change-me", alias="SECRET_KEY")

    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        alias="CORS_ORIGINS",
    )
    allowed_hosts: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        alias="ALLOWED_HOSTS",
    )


settings = Settings()
