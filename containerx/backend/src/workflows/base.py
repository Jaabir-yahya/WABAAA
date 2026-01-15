from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict

import pytz


logger = logging.getLogger(__name__)


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class WorkflowStep:
    def __init__(self, name: str, execute_func: Callable, retry_count: int = 3):
        self.name = name
        self.execute_func = execute_func
        self.retry_count = retry_count
        self.status = WorkflowStatus.PENDING
        self.result: Any = None
        self.error: str | None = None
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None


class BaseWorkflow(ABC):
    def __init__(self, workflow_instance_id: str, db_session, tenant_config: Dict[str, Any]):
        self.workflow_instance_id = workflow_instance_id
        self.db = db_session
        self.tenant_config = tenant_config
        self.steps: Dict[str, WorkflowStep] = {}
        self.context: Dict[str, Any] = {}
        self.retry_delay = 5
        self.nairobi_tz = pytz.timezone("Africa/Nairobi")

    async def execute(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        self.context.update(trigger_data)

        if not self._is_business_hours():
            return {
                "status": WorkflowStatus.QUEUED,
                "reason": "outside_business_hours",
                "scheduled_for": self._next_business_hour(),
            }

        for step_name, step in self.steps.items():
            step.started_at = datetime.utcnow()
            for attempt in range(step.retry_count):
                try:
                    step.result = await step.execute_func(self.context)
                    step.status = WorkflowStatus.COMPLETED
                    break
                except Exception as exc:
                    step.error = str(exc)
                    step.status = WorkflowStatus.FAILED
                    if attempt < step.retry_count - 1:
                        step.status = WorkflowStatus.RETRYING
                        await asyncio.sleep(self.retry_delay * (2 ** attempt))
                    else:
                        await self._handle_step_failure(step_name, exc)
                        return {
                            "status": WorkflowStatus.FAILED,
                            "failed_step": step_name,
                            "error": str(exc),
                        }
            step.completed_at = datetime.utcnow()
            await asyncio.sleep(0.5)

        result = await self._on_complete()
        return {"status": WorkflowStatus.COMPLETED, "result": result}

    def _is_business_hours(self) -> bool:
        now = datetime.now(self.nairobi_tz)
        hours = self.tenant_config.get("business_hours", {"start": "08:00", "end": "20:00"})
        start_hour, start_minute = map(int, hours["start"].split(":"))
        end_hour, end_minute = map(int, hours["end"].split(":"))
        start_time = now.replace(hour=start_hour, minute=start_minute, second=0)
        end_time = now.replace(hour=end_hour, minute=end_minute, second=0)
        if now.weekday() >= 5:
            return False
        return start_time <= now <= end_time

    def _next_business_hour(self) -> str:
        now = datetime.now(self.nairobi_tz)
        start_hour, _ = map(
            int, self.tenant_config.get("business_hours", {"start": "08:00"})["start"].split(":")
        )
        if now.hour < start_hour:
            return now.replace(hour=start_hour, minute=0, second=0).isoformat()
        next_day = now + timedelta(days=1)
        if next_day.weekday() >= 5:
            next_day += timedelta(days=7 - next_day.weekday())
        return next_day.replace(hour=start_hour, minute=0, second=0).isoformat()

    def serialize_steps(self) -> list[dict[str, Any]]:
        return [
            {
                "step": step.name,
                "status": step.status,
                "error": step.error,
                "started_at": step.started_at.isoformat() if step.started_at else None,
                "completed_at": step.completed_at.isoformat() if step.completed_at else None,
            }
            for step in self.steps.values()
        ]

    @abstractmethod
    async def _on_complete(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def _handle_step_failure(self, step_name: str, error: Exception):
        raise NotImplementedError
