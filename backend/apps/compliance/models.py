import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.organizations.models import Organization


class DocumentType(UUIDModel, TimeStampedModel):
    """Configurable document requirements (managed by platform admin)."""

    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    help_text = models.TextField(blank=True, help_text="Shown to restaurants during upload.")
    required_for_activation = models.BooleanField(default=True)
    max_files = models.PositiveSmallIntegerField(default=1)
    allowed_extensions = models.JSONField(
        default=list,
        help_text='Lowercase extensions without dot, e.g. ["pdf","jpg","png"]',
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "compliance_document_type"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


def compliance_upload_to(instance: "OrganizationDocument", filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"compliance/org/{instance.organization_id}/{instance.document_type.slug}/{uuid.uuid4()}.{ext}"


class OrganizationDocument(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="compliance_documents"
    )
    document_type = models.ForeignKey(
        DocumentType, on_delete=models.CASCADE, related_name="uploads"
    )
    file = models.FileField(upload_to=compliance_upload_to)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_compliance_documents",
    )

    class Meta:
        db_table = "compliance_organization_document"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.organization} / {self.document_type.slug}"


class ComplianceSubmissionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CHANGES_REQUESTED = "changes_requested", "Changes requested"


class ComplianceSubmission(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="compliance_submissions"
    )
    status = models.CharField(
        max_length=32,
        choices=ComplianceSubmissionStatus.choices,
        default=ComplianceSubmissionStatus.SUBMITTED,
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="compliance_submissions_submitted",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compliance_submissions_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        db_table = "compliance_submission"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.organization} · {self.status}"
