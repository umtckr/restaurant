from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel


class OrganizationOnboardingStatus(models.TextChoices):
    PENDING_DOCUMENTS = "pending_documents", "Pending documents"
    PENDING_REVIEW = "pending_review", "Pending review"
    CHANGES_REQUESTED = "changes_requested", "Changes requested"
    REJECTED = "rejected", "Rejected"
    ACTIVE = "active", "Active"


class Organization(UUIDModel, TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    logo = models.URLField(max_length=500, blank=True)
    primary_color = models.CharField(max_length=7, blank=True, help_text="Hex color e.g. #c45c26")
    is_active = models.BooleanField(default=True)
    onboarding_status = models.CharField(
        max_length=32,
        choices=OrganizationOnboardingStatus.choices,
        default=OrganizationOnboardingStatus.PENDING_DOCUMENTS,
        db_index=True,
    )

    class Meta:
        db_table = "organizations_organization"
        ordering = ["name"]

    def __str__(self):
        return self.name
