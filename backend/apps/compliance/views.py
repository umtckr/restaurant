from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.compliance.models import (
    ComplianceSubmission,
    ComplianceSubmissionStatus,
    DocumentType,
    OrganizationDocument,
)
from apps.compliance.serializers import (
    ComplianceSubmissionSerializer,
    DocumentTypeSerializer,
    OrganizationDocumentCreateSerializer,
    OrganizationDocumentSerializer,
    SubmitComplianceSerializer,
)
from apps.core.permissions import IsPlatformAdmin
from apps.organizations.models import Organization, OrganizationOnboardingStatus
from apps.staff.models import StaffAssignment, StaffRole


def _user_can_manage_org_documents(user, org: Organization) -> bool:
    if getattr(user, "is_platform_admin", False):
        return True
    return StaffAssignment.objects.filter(
        user=user,
        organization=org,
        role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
    ).exists()


def _org_allows_document_upload(org: Organization) -> bool:
    return org.onboarding_status in (
        OrganizationOnboardingStatus.PENDING_DOCUMENTS,
        OrganizationOnboardingStatus.CHANGES_REQUESTED,
    )


class DocumentTypeViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentTypeSerializer
    queryset = DocumentType.objects.all().order_by("sort_order", "name")

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsPlatformAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_platform_admin", False):
            return qs
        if self.action == "list":
            return qs.filter(is_active=True)
        return qs


class OrganizationDocumentViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "delete", "head", "options"]
    serializer_class = OrganizationDocumentSerializer

    def get_queryset(self):
        user = self.request.user
        base = OrganizationDocument.objects.select_related(
            "organization", "document_type", "uploaded_by"
        )
        if getattr(user, "is_platform_admin", False):
            qs = base.all()
        else:
            org_ids = StaffAssignment.objects.filter(user=user).values_list(
                "organization_id", flat=True
            )
            qs = base.filter(organization_id__in=org_ids)
        if self.action == "list":
            org_id = self.request.query_params.get("organization")
            if not org_id:
                return OrganizationDocument.objects.none()
            org = Organization.objects.filter(pk=org_id).first()
            if not org or not _user_can_manage_org_documents(user, org):
                return OrganizationDocument.objects.none()
            return qs.filter(organization_id=org_id)
        return qs

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def _organization_from_query(self) -> Organization:
        org_id = self.request.query_params.get("organization")
        if not org_id:
            raise ValidationError({"organization": "Query parameter organization is required."})
        org = get_object_or_404(Organization, pk=org_id)
        if not _user_can_manage_org_documents(self.request.user, org):
            raise PermissionDenied()
        return org

    def create(self, request, *args, **kwargs):
        org = self._organization_from_query()
        if not _org_allows_document_upload(org):
            raise PermissionDenied("Document uploads are not allowed in the current onboarding state.")
        ser = OrganizationDocumentCreateSerializer(
            data=request.data,
            context={"request": request, "organization": org},
        )
        ser.is_valid(raise_exception=True)
        doc = ser.save()
        return Response(OrganizationDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        org = instance.organization
        if not _user_can_manage_org_documents(self.request.user, org):
            raise PermissionDenied()
        if not _org_allows_document_upload(org):
            raise PermissionDenied("Cannot delete documents in the current onboarding state.")
        instance.delete()


class SubmitComplianceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        ser = SubmitComplianceSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        sub = ser.save()
        return Response(ComplianceSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


class PlatformComplianceQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        qs = (
            ComplianceSubmission.objects.filter(status=ComplianceSubmissionStatus.SUBMITTED)
            .select_related("organization", "submitted_by")
            .order_by("submitted_at")
        )
        return Response(ComplianceSubmissionSerializer(qs, many=True).data)


class PlatformComplianceApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    @transaction.atomic
    def post(self, request, pk):
        sub = get_object_or_404(
            ComplianceSubmission.objects.select_related("organization"),
            pk=pk,
            status=ComplianceSubmissionStatus.SUBMITTED,
        )
        org = sub.organization
        org.onboarding_status = OrganizationOnboardingStatus.ACTIVE
        org.save(update_fields=["onboarding_status", "updated_at"])
        sub.status = ComplianceSubmissionStatus.APPROVED
        sub.reviewed_by = request.user
        sub.reviewed_at = timezone.now()
        sub.admin_notes = (request.data.get("admin_notes") or "")[:4000]
        sub.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "admin_notes",
                "updated_at",
            ]
        )
        return Response(ComplianceSubmissionSerializer(sub).data)


class PlatformComplianceRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    @transaction.atomic
    def post(self, request, pk):
        sub = get_object_or_404(
            ComplianceSubmission.objects.select_related("organization"),
            pk=pk,
            status=ComplianceSubmissionStatus.SUBMITTED,
        )
        org = sub.organization
        raw = request.data.get("allow_resubmit", True)
        allow_resubmit = raw not in (False, "false", "0", 0)

        notes = (request.data.get("admin_notes") or "")[:4000]
        if allow_resubmit:
            org.onboarding_status = OrganizationOnboardingStatus.CHANGES_REQUESTED
            sub.status = ComplianceSubmissionStatus.CHANGES_REQUESTED
        else:
            org.onboarding_status = OrganizationOnboardingStatus.REJECTED
            sub.status = ComplianceSubmissionStatus.REJECTED
        org.save(update_fields=["onboarding_status", "updated_at"])
        sub.reviewed_by = request.user
        sub.reviewed_at = timezone.now()
        sub.admin_notes = notes
        sub.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "admin_notes",
                "updated_at",
            ]
        )
        return Response(ComplianceSubmissionSerializer(sub).data)
