import logging

from src.tasks.celery_app import celery_app


logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def send_payment_reminders(self):
    logger.info("Reminder task placeholder - implement reminder workflow.")
    return {"status": "skipped"}
