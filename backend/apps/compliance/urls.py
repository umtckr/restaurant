from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.compliance.views import (
    DocumentTypeViewSet,
    OrganizationDocumentViewSet,
    PlatformComplianceApproveView,
    PlatformComplianceQueueView,
    PlatformComplianceRejectView,
    SubmitComplianceView,
)

router = DefaultRouter()
router.register("document-types", DocumentTypeViewSet, basename="documenttype")
router.register("organization-documents", OrganizationDocumentViewSet, basename="organizationdocument")

urlpatterns = [
    path("compliance/submit/", SubmitComplianceView.as_view(), name="compliance-submit"),
    path(
        "platform/compliance-queue/",
        PlatformComplianceQueueView.as_view(),
        name="platform-compliance-queue",
    ),
    path(
        "platform/compliance-submissions/<uuid:pk>/approve/",
        PlatformComplianceApproveView.as_view(),
        name="platform-compliance-approve",
    ),
    path(
        "platform/compliance-submissions/<uuid:pk>/reject/",
        PlatformComplianceRejectView.as_view(),
        name="platform-compliance-reject",
    ),
] + router.urls
