import os

from celery import Celery
from celery.schedules import crontab


os.environ.setdefault("TZ", "Africa/Nairobi")

celery_app = Celery(
    "containerx",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    include=["src.tasks.reminder_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)

celery_app.conf.beat_schedule = {
    "send-daily-reminders": {
        "task": "src.tasks.reminder_tasks.send_payment_reminders",
        "schedule": crontab(hour=10, minute=0),
        "args": (),
    }
}
