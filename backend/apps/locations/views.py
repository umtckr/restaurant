from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import APIException, PermissionDenied

from apps.core.permissions import IsPlatformAdmin
from apps.locations.models import Location, Table, Zone
from apps.locations.serializers import LocationSerializer, TableSerializer, ZoneSerializer
from apps.organizations.models import OrganizationOnboardingStatus
from apps.staff.models import StaffAssignment, StaffRole
from apps.staff.utils import user_can_access_location, user_has_role_for_location, user_location_ids
from apps.subscriptions.services import PlanLimitError, check_limit


class PaymentRequired(APIException):
    status_code = 402
    default_detail = "Plan limit reached."

ADMIN_MANAGER_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER]


def _location_scoped_q(user):
    lids = user_location_ids(user) or []
    org_scope_ids = list(
        StaffAssignment.objects.filter(
            user=user,
            location__isnull=True,
            role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
        ).values_list("organization_id", flat=True)
    )
    q = Q()
    if lids:
        q |= Q(location_id__in=lids)
    if org_scope_ids:
        q |= Q(location__organization_id__in=org_scope_ids)
    return q


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    filterset_fields = ("organization", "slug", "is_active")

    def get_queryset(self):
        user = self.request.user
        qs = Location.objects.select_related("organization").all()
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE)
        lids = user_location_ids(user) or []
        org_scope_ids = list(
            StaffAssignment.objects.filter(
                user=user,
                location__isnull=True,
                role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
            ).values_list("organization_id", flat=True)
        )
        q = Q()
        if lids:
            q |= Q(pk__in=lids)
        if org_scope_ids:
            q |= Q(organization_id__in=org_scope_ids)
        if not q:
            return Location.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        org = serializer.validated_data["organization"]
        if getattr(user, "is_platform_admin", False):
            serializer.save()
            return
        if org.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            raise PermissionDenied("Organization must be approved before creating locations.")
        allowed = StaffAssignment.objects.filter(
            user=user,
            organization=org,
            location__isnull=True,
            role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
        ).exists()
        if not allowed:
            raise PermissionDenied()
        try:
            current = Location.objects.filter(organization=org).count()
            check_limit(org, "max_locations", current)
        except PlanLimitError as e:
            raise PaymentRequired(detail=str(e))
        serializer.save()

    def perform_update(self, serializer):
        loc = serializer.instance
        if not user_has_role_for_location(self.request.user, loc.pk, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can edit locations.")
        serializer.save()


class ZoneViewSet(viewsets.ModelViewSet):
    serializer_class = ZoneSerializer
    filterset_fields = ("location",)

    def get_queryset(self):
        user = self.request.user
        qs = Zone.objects.select_related("location", "location__organization")
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(
            location__organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE
        )
        q = _location_scoped_q(user)
        if not q:
            return Zone.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        loc = serializer.validated_data["location"]
        if not user_has_role_for_location(self.request.user, loc.pk, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage zones.")
        serializer.save()

    def perform_update(self, serializer):
        zone = serializer.instance
        if not user_has_role_for_location(self.request.user, zone.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage zones.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_has_role_for_location(self.request.user, instance.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage zones.")
        instance.delete()


class TableViewSet(viewsets.ModelViewSet):
    serializer_class = TableSerializer
    filterset_fields = ("location", "zone")

    def get_queryset(self):
        user = self.request.user
        qs = Table.objects.select_related("location", "location__organization", "zone")
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(
            location__organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE
        )
        q = _location_scoped_q(user)
        if not q:
            return Table.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        loc = serializer.validated_data["location"]
        if not user_has_role_for_location(self.request.user, loc.pk, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage tables.")
        if not getattr(self.request.user, "is_platform_admin", False):
            try:
                current = Table.objects.filter(location__organization=loc.organization).count()
                check_limit(loc.organization, "max_tables", current)
            except PlanLimitError as e:
                raise PaymentRequired(detail=str(e))
        serializer.save()

    def perform_update(self, serializer):
        table = serializer.instance
        if not user_has_role_for_location(self.request.user, table.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage tables.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_has_role_for_location(self.request.user, instance.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage tables.")
        instance.delete()
