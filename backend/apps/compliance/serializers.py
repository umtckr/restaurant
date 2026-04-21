from django.utils import timezone
from rest_framework import serializers

from apps.compliance.models import (
    ComplianceSubmission,
    ComplianceSubmissionStatus,
    DocumentType,
    OrganizationDocument,
)
from apps.organizations.models import Organization, OrganizationOnboardingStatus
from apps.staff.models import StaffAssignment, StaffRole


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "help_text",
            "required_for_activation",
            "max_files",
            "allowed_extensions",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class OrganizationDocumentSerializer(serializers.ModelSerializer):
    document_type_slug = serializers.SlugField(source="document_type.slug", read_only=True)
    document_type_name = serializers.CharField(source="document_type.name", read_only=True)

    class Meta:
        model = OrganizationDocument
        fields = (
            "id",
            "organization",
            "document_type",
            "document_type_slug",
            "document_type_name",
            "file",
            "uploaded_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "uploaded_by",
            "created_at",
            "updated_at",
        )


class ComplianceSubmissionSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = ComplianceSubmission
        fields = (
            "id",
            "organization",
            "organization_name",
            "status",
            "submitted_by",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "admin_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


def _extensions_ok(filename: str, allowed: list) -> bool:
    if not allowed:
        return True
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in {str(x).lower().lstrip(".") for x in allowed}


class OrganizationDocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationDocument
        fields = ("document_type", "file")

    def validate(self, attrs):
        org: Organization = self.context["organization"]
        dt: DocumentType = attrs["document_type"]
        if not dt.is_active:
            raise serializers.ValidationError({"document_type": "This document type is not active."})
        f = attrs.get("file")
        if f and not _extensions_ok(f.name, dt.allowed_extensions or []):
            raise serializers.ValidationError(
                {"file": f"Allowed types: {', '.join(dt.allowed_extensions or [])}"}
            )
        count = OrganizationDocument.objects.filter(
            organization=org, document_type=dt
        ).count()
        if count >= dt.max_files:
            raise serializers.ValidationError(
                {"document_type": f"Maximum {dt.max_files} file(s) for this document type."}
            )
        return attrs

    def create(self, validated_data):
        org = self.context["organization"]
        request = self.context["request"]
        return OrganizationDocument.objects.create(
            organization=org,
            uploaded_by=request.user,
            **validated_data,
        )


class SubmitComplianceSerializer(serializers.Serializer):
    organization = serializers.UUIDField()

    def validate_organization(self, value):
        try:
            org = Organization.objects.get(pk=value)
        except Organization.DoesNotExist as exc:
            raise serializers.ValidationError("Organization not found.") from exc
        user = self.context["request"].user
        if not StaffAssignment.objects.filter(user=user, organization=org).exists():
            raise serializers.ValidationError("You are not a member of this organization.")
        if org.onboarding_status not in (
            OrganizationOnboardingStatus.PENDING_DOCUMENTS,
            OrganizationOnboardingStatus.CHANGES_REQUESTED,
        ):
            raise serializers.ValidationError(
                "Documents can only be submitted when onboarding is awaiting upload or changes."
            )
        required = DocumentType.objects.filter(
            is_active=True, required_for_activation=True
        )
        for dt in required:
            n = OrganizationDocument.objects.filter(organization=org, document_type=dt).count()
            if n < 1:
                raise serializers.ValidationError(
                    f"Missing required document: {dt.name} ({dt.slug})."
                )
        return value

    def create(self, validated_data):
        org = Organization.objects.select_for_update().get(pk=validated_data["organization"])
        user = self.context["request"].user
        sub = ComplianceSubmission.objects.create(
            organization=org,
            status=ComplianceSubmissionStatus.SUBMITTED,
            submitted_by=user,
            submitted_at=timezone.now(),
        )
        org.onboarding_status = OrganizationOnboardingStatus.PENDING_REVIEW
        org.save(update_fields=["onboarding_status", "updated_at"])
        return sub
