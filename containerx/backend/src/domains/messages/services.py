from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from src.database.models import Message


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def log_outbound(
        self,
        tenant_id: str,
        phone_number: str,
        channel: str,
        content: Optional[str] = None,
        template_name: Optional[str] = None,
        external_message_id: Optional[str] = None,
        workflow_instance_id: Optional[str] = None,
        cost_cents: int = 0,
        customer_id: Optional[str] = None,
    ) -> Message:
        message = Message(
            tenant_id=tenant_id,
            customer_id=customer_id,
            channel=channel,
            direction="outbound",
            phone_number=phone_number,
            content=content,
            template_name=template_name,
            external_message_id=external_message_id,
            workflow_instance_id=workflow_instance_id,
            cost_cents=cost_cents,
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message
