from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.locations.models import Location
from apps.organizations.models import Organization


class StaffRole(models.TextChoices):
    ORG_ADMIN = "org_admin", "Organization admin"
    MANAGER = "manager", "Manager"
    WAITER = "waiter", "Waiter"
    KITCHEN = "kitchen", "Kitchen"
    HOST = "host", "Host"


class StaffAssignment(UUIDModel, TimeStampedModel):
    """One row per user per location within an organization."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_assignments",
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="staff_assignments"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="staff_assignments",
    )
    role = models.CharField(max_length=32, choices=StaffRole.choices)

    class Meta:
        db_table = "staff_assignment"
        indexes = [
            models.Index(fields=["organization", "location"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                condition=models.Q(location__isnull=True),
                name="staff_assignment_unique_user_org_when_no_location",
            ),
            models.UniqueConstraint(
                fields=["user", "location"],
                condition=models.Q(location__isnull=False),
                name="staff_assignment_unique_user_location_when_location_set",
            ),
        ]

    def __str__(self):
        loc = self.location.name if self.location_id else "organization"
        return f"{self.user.email} @ {loc} ({self.role})"


class Shift(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="shifts"
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "staff_shift"
        ordering = ["starts_at"]
