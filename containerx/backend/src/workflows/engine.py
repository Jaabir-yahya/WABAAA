from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Type
from sqlalchemy.orm import Session

from src.database.models import Tenant, WorkflowInstance
from src.workflows.base import BaseWorkflow, WorkflowStatus
from src.workflows.flows.payment_receipt import PaymentReceiptWorkflow


logger = logging.getLogger(__name__)


class WorkflowEngine:
    registry: Dict[str, Type[BaseWorkflow]] = {
        "payment_receipt": PaymentReceiptWorkflow,
    }

    def __init__(self, db: Session):
        self.db = db

    async def trigger_workflow(
        self,
        tenant_id: str,
        workflow_type: str,
        trigger_event: str,
        trigger_data: Dict[str, Any],
    ) -> WorkflowInstance:
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError("Tenant not found")

        workflow_class = self.registry.get(workflow_type)
        if not workflow_class:
            raise ValueError(f"Unknown workflow: {workflow_type}")

        workflow_instance = WorkflowInstance(
            tenant_id=tenant.id,
            workflow_type=workflow_type,
            trigger_event=trigger_event,
            trigger_data=trigger_data,
            status=WorkflowStatus.RUNNING.value,
        )
        self.db.add(workflow_instance)
        self.db.commit()
        self.db.refresh(workflow_instance)

        tenant_config = tenant.config or {}
        tenant_config["tenant_id"] = str(tenant.id)
        workflow = workflow_class(str(workflow_instance.id), self.db, tenant_config)
        result = await workflow.execute(trigger_data)

        workflow_instance.steps = workflow.serialize_steps()
        workflow_instance.status = result.get("status", WorkflowStatus.FAILED).value
        if workflow_instance.status == WorkflowStatus.COMPLETED.value:
            workflow_instance.completed_at = datetime.utcnow()
        if result.get("status") == WorkflowStatus.FAILED:
            workflow_instance.error_message = result.get("error")

        self.db.add(workflow_instance)
        self.db.commit()
        return workflow_instance
