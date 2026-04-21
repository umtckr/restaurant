from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel


class Notification(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]
