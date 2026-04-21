import uuid

from django.db import IntegrityError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations.models import Table
from apps.organizations.models import OrganizationOnboardingStatus
from apps.sessions_app.models import DiningSession, DiningSessionStatus
from apps.sessions_app.serializers import DiningSessionPublicSerializer, DiningSessionSerializer
from apps.staff.models import StaffAssignment, StaffRole
from apps.staff.utils import user_can_access_location, user_has_role_for_location, user_location_ids

SESSION_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER, StaffRole.WAITER, StaffRole.HOST]


class DiningSessionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DiningSessionSerializer
    filterset_fields = ("location", "status")

    def get_queryset(self):
        user = self.request.user
        qs = DiningSession.objects.select_related("location", "location__organization", "table")
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(
            location__organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE
        )
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
        if not q:
            return DiningSession.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"], url_path="open")
    def open_session(self, request):
        table_id = request.data.get("table_id")
        if not table_id:
            return Response({"table_id": "required"}, status=status.HTTP_400_BAD_REQUEST)
        table = get_object_or_404(
            Table.objects.select_related("location", "location__organization"), pk=table_id
        )
        if table.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(
                {"detail": "This venue is not accepting sessions yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user_has_role_for_location(request.user, table.location_id, SESSION_ROLES):
            return Response(
                {"detail": "You do not have permission to open sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        token = uuid.uuid4()
        try:
            session = DiningSession.objects.create(
                location=table.location,
                table=table,
                token=token,
                status=DiningSessionStatus.OPEN,
            )
        except IntegrityError:
            return Response(
                {"detail": "This table already has an open session."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(DiningSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="close")
    def close_session(self, request, pk=None):
        session = self.get_object()
        if session.status != DiningSessionStatus.OPEN:
            return Response({"detail": "Already closed."}, status=status.HTTP_400_BAD_REQUEST)
        if not user_has_role_for_location(request.user, session.location_id, SESSION_ROLES):
            return Response(
                {"detail": "You do not have permission to close sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        session.status = DiningSessionStatus.CLOSED
        session.closed_at = timezone.now()
        session.closed_by = request.user
        session.save(update_fields=["status", "closed_at", "closed_by", "updated_at"])
        return Response(DiningSessionSerializer(session).data)


class DiningSessionByTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            tid = uuid.UUID(str(token))
        except ValueError:
            return Response(status=status.HTTP_404_NOT_FOUND)
        session = (
            DiningSession.objects.select_related("location", "table", "location__organization")
            .filter(token=tid, status=DiningSessionStatus.OPEN)
            .first()
        )
        if not session:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if session.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DiningSessionPublicSerializer(session).data)
