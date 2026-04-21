from rest_framework import permissions, viewsets

from apps.core.permissions import IsPlatformAdmin
from apps.platform_admin.models import AuditLog
from apps.platform_admin.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        return AuditLog.objects.select_related("actor").all()
