from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.locations.models import Location, Table


class DiningSessionStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class DiningSession(UUIDModel, TimeStampedModel):
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="dining_sessions"
    )
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name="dining_sessions")
    token = models.UUIDField(unique=True, db_index=True)
    status = models.CharField(
        max_length=16,
        choices=DiningSessionStatus.choices,
        default=DiningSessionStatus.OPEN,
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_dining_sessions",
    )

    class Meta:
        db_table = "sessions_dining_session"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["location", "table"],
                condition=models.Q(status="open"),
                name="unique_open_dining_session_per_table",
            ),
        ]
