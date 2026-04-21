from rest_framework import permissions, viewsets

from apps.core.permissions import IsPlatformAdmin
from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer
from apps.staff.utils import user_organization_ids


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return Organization.objects.all()
        org_ids = user_organization_ids(user)
        if not org_ids:
            return Organization.objects.none()
        return Organization.objects.filter(pk__in=org_ids)

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.IsAuthenticated()]
