from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from src.database.models import UsageRecord


class UsageTracker:
    def __init__(self, db: Session):
        self.db = db

    def _get_or_create(self, tenant_id: str, day: date) -> UsageRecord:
        record = (
            self.db.query(UsageRecord)
            .filter(UsageRecord.tenant_id == tenant_id, UsageRecord.date == day)
            .first()
        )
        if record:
            return record
        record = UsageRecord(tenant_id=tenant_id, date=day)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def increment_sms(self, tenant_id: str, count: int = 1, cost_cents: int = 0) -> UsageRecord:
        record = self._get_or_create(tenant_id, date.today())
        record.sms_messages += count
        record.total_cost_cents += cost_cents
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def increment_mpesa(self, tenant_id: str, count: int = 1, cost_cents: int = 0) -> UsageRecord:
        record = self._get_or_create(tenant_id, date.today())
        record.m_pesa_transactions += count
        record.total_cost_cents += cost_cents
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record
