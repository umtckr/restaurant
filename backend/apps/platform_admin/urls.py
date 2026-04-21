from rest_framework.routers import DefaultRouter

from apps.platform_admin.views import AuditLogViewSet

router = DefaultRouter()
router.register("audit-logs", AuditLogViewSet, basename="auditlog")

urlpatterns = router.urls
