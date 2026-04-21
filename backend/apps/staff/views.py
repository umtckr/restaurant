from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsPlatformAdmin
from apps.locations.models import Location
from apps.organizations.models import Organization, OrganizationOnboardingStatus
from apps.staff.models import Shift, StaffAssignment, StaffRole
from apps.staff.serializers import ShiftSerializer, StaffAssignmentSerializer
from apps.staff.utils import user_has_role_for_location, user_location_ids, user_organization_ids
from apps.subscriptions.services import PlanLimitError, check_limit

ADMIN_MANAGER_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER]

User = get_user_model()

SINGLE_LOCATION_ROLES = {StaffRole.WAITER, StaffRole.KITCHEN, StaffRole.HOST}


OPERATIONAL_ROLES = {StaffRole.WAITER, StaffRole.KITCHEN, StaffRole.HOST}


def _caller_admin_org_ids(user):
    """Return org IDs where user is org_admin (org-level, no location)."""
    return list(
        StaffAssignment.objects.filter(
            user=user,
            location__isnull=True,
            role=StaffRole.ORG_ADMIN,
        ).values_list("organization_id", flat=True)
    )


def _caller_manager_org_ids(user):
    """Return org IDs where user is org_admin or manager."""
    return list(
        StaffAssignment.objects.filter(
            user=user,
            role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
        ).values_list("organization_id", flat=True).distinct()
    )


def _can_manage_target(caller, target_user, org_id=None):
    """
    Hierarchical permission: can `caller` manage `target_user`?

    Rules:
    - Platform admin can manage anyone.
    - Org admin can manage any staff in their org (managers, operational).
    - Manager can only manage operational roles (waiter/kitchen/host)
      within locations the manager has access to.
    - Managers cannot manage other managers or org_admins.
    - Nobody can manage themselves (handled by callers).
    """
    if caller.is_platform_admin:
        return True

    caller_assignments = StaffAssignment.objects.filter(user=caller)
    if org_id:
        caller_assignments = caller_assignments.filter(organization_id=org_id)

    caller_roles = set(caller_assignments.values_list("role", flat=True))

    if StaffRole.ORG_ADMIN in caller_roles:
        return True

    if StaffRole.MANAGER not in caller_roles:
        return False

    target_assignments = StaffAssignment.objects.filter(user=target_user)
    if org_id:
        target_assignments = target_assignments.filter(organization_id=org_id)

    target_roles = set(target_assignments.values_list("role", flat=True))

    if not target_roles.issubset(OPERATIONAL_ROLES):
        return False

    caller_loc_ids = set(
        caller_assignments.filter(
            role=StaffRole.MANAGER, location__isnull=False,
        ).values_list("location_id", flat=True)
    )
    caller_has_org_wide = caller_assignments.filter(
        role=StaffRole.MANAGER, location__isnull=True,
    ).exists()

    if caller_has_org_wide:
        return True

    target_loc_ids = set(
        target_assignments.filter(location__isnull=False).values_list("location_id", flat=True)
    )
    target_has_no_loc = target_assignments.filter(location__isnull=True).exists()

    if target_has_no_loc and not caller_has_org_wide:
        return False

    if not target_loc_ids:
        return True

    return target_loc_ids.issubset(caller_loc_ids)


class StaffAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAssignmentSerializer
    filterset_fields = ("organization", "location", "user", "role")

    def get_queryset(self):
        user = self.request.user
        qs = StaffAssignment.objects.select_related("user", "organization", "location")
        if user.is_platform_admin:
            return qs
        org_ids = user_organization_ids(user)
        if not org_ids:
            return StaffAssignment.objects.none()
        return qs.filter(organization_id__in=org_ids)

    def get_permissions(self):
        base = [permissions.IsAuthenticated()]
        if self.action in ("create", "update", "partial_update", "destroy", "reassign", "set_locations"):
            return base
        return base

    def _check_manage_permission(self, request, org_id):
        user = request.user
        if user.is_platform_admin:
            return True
        admin_ids = _caller_admin_org_ids(user)
        manager_ids = _caller_manager_org_ids(user)
        return str(org_id) in [str(i) for i in admin_ids + manager_ids]

    def perform_create(self, serializer):
        org_id = serializer.validated_data.get("organization")
        if org_id and not self._check_manage_permission(self.request, org_id.pk if hasattr(org_id, "pk") else org_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage staff in your own organization.")
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        if not self._check_manage_permission(self.request, instance.organization_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage staff in your own organization.")
        if not _can_manage_target(self.request.user, instance.user, instance.organization_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to edit this staff member.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._check_manage_permission(self.request, instance.organization_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage staff in your own organization.")
        if not _can_manage_target(self.request.user, instance.user, instance.organization_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to remove this staff member.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def reassign(self, request, pk=None):
        """Reassign an operational role (waiter/kitchen/host) to a new location."""
        assignment = self.get_object()
        if not self._check_manage_permission(request, assignment.organization_id):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        if not _can_manage_target(request.user, assignment.user, assignment.organization_id):
            return Response({"detail": "You do not have permission to reassign this staff member."}, status=status.HTTP_403_FORBIDDEN)

        new_location_id = request.data.get("location")
        if not new_location_id:
            return Response({"detail": "location is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_loc = Location.objects.get(pk=new_location_id, organization_id=assignment.organization_id)
        except Location.DoesNotExist:
            return Response({"detail": "Location not found in this organization."}, status=status.HTTP_404_NOT_FOUND)

        assignment.location = new_loc
        assignment.save(update_fields=["location", "updated_at"])
        return Response(StaffAssignmentSerializer(assignment).data)

    @action(detail=False, methods=["post"], url_path="set-locations")
    def set_locations(self, request):
        """
        Set the location assignments for a user in an org.
        For manager: creates/removes rows to match the given location list.
        For operational roles: accepts exactly one location.
        Body: { user: int, organization: str, locations: [str, ...] }
        """
        user_id = request.data.get("user")
        org_id = request.data.get("organization")
        location_ids = request.data.get("locations", [])

        if not user_id or not org_id:
            return Response({"detail": "user and organization are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not self._check_manage_permission(request, org_id):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_manage_target(request.user, target_user, org_id):
            return Response({"detail": "You do not have permission to manage this staff member."}, status=status.HTTP_403_FORBIDDEN)

        org_assignment = StaffAssignment.objects.filter(
            user=target_user, organization_id=org_id,
        ).first()
        if not org_assignment:
            return Response({"detail": "User has no assignment in this organization."}, status=status.HTTP_404_NOT_FOUND)

        role = org_assignment.role

        valid_locs = set(
            Location.objects.filter(
                pk__in=location_ids, organization_id=org_id
            ).values_list("pk", flat=True)
        )
        location_ids_set = {str(lid) for lid in valid_locs}

        if role in SINGLE_LOCATION_ROLES:
            if len(location_ids_set) > 1:
                return Response(
                    {"detail": f"{role} can only be assigned to one location at a time."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            existing_loc_assignments = StaffAssignment.objects.filter(
                user=target_user, organization_id=org_id, location__isnull=False,
            )
            existing_loc_ids = set(str(a.location_id) for a in existing_loc_assignments)

            to_remove = existing_loc_ids - location_ids_set
            to_add = location_ids_set - existing_loc_ids

            if to_remove:
                StaffAssignment.objects.filter(
                    user=target_user, organization_id=org_id,
                    location_id__in=[lid for lid in to_remove],
                ).delete()

            for lid in to_add:
                StaffAssignment.objects.create(
                    user=target_user, organization_id=org_id,
                    location_id=lid, role=role,
                )

            org_level = StaffAssignment.objects.filter(
                user=target_user, organization_id=org_id, location__isnull=True,
            ).first()

            if role in SINGLE_LOCATION_ROLES:
                if location_ids_set:
                    if org_level:
                        org_level.delete()
                else:
                    if not org_level:
                        StaffAssignment.objects.create(
                            user=target_user, organization_id=org_id,
                            location=None, role=role,
                        )
            elif role == StaffRole.MANAGER:
                if location_ids_set:
                    if org_level:
                        org_level.delete()
                else:
                    if not org_level:
                        StaffAssignment.objects.create(
                            user=target_user, organization_id=org_id,
                            location=None, role=role,
                        )

        final = StaffAssignment.objects.filter(
            user=target_user, organization_id=org_id,
        ).select_related("user", "organization", "location")
        return Response(StaffAssignmentSerializer(final, many=True).data)


class StaffMemberView(APIView):
    """
    Org admins can create and remove staff user accounts within their own org.
    POST  — create a user + assign them to the caller's org (with optional location).
    DELETE — deactivate the user and remove their assignments in the caller's org.
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        caller_is_admin = False
        caller_is_manager = False
        admin_org_ids = None
        manager_org_ids_list = []

        if user.is_platform_admin:
            caller_is_admin = True
        else:
            admin_org_ids = _caller_admin_org_ids(user)
            if admin_org_ids:
                caller_is_admin = True
            else:
                manager_org_ids_list = list(
                    StaffAssignment.objects.filter(
                        user=user, role=StaffRole.MANAGER,
                    ).values_list("organization_id", flat=True).distinct()
                )
                if manager_org_ids_list:
                    caller_is_manager = True
                else:
                    return Response(
                        {"detail": "Only organization admins or managers can create staff accounts."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        role = request.data.get("role", StaffRole.WAITER)
        organization_id = request.data.get("organization")
        location_id = request.data.get("location")
        location_ids = request.data.get("locations", [])

        if not email or not password:
            return Response({"detail": "email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in StaffRole.values:
            return Response({"detail": f"Invalid role. Choose from: {', '.join(StaffRole.values)}"}, status=status.HTTP_400_BAD_REQUEST)

        if caller_is_manager and role not in OPERATIONAL_ROLES:
            return Response(
                {"detail": "Managers can only create operational staff (waiter, kitchen, host)."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not organization_id:
            if user.is_platform_admin:
                return Response({"detail": "organization is required."}, status=status.HTTP_400_BAD_REQUEST)
            if admin_org_ids:
                organization_id = admin_org_ids[0]
            elif manager_org_ids_list:
                organization_id = manager_org_ids_list[0]
        else:
            allowed_ids = []
            if admin_org_ids:
                allowed_ids += [str(i) for i in admin_org_ids]
            if manager_org_ids_list:
                allowed_ids += [str(i) for i in manager_org_ids_list]
            if not user.is_platform_admin and str(organization_id) not in allowed_ids:
                return Response({"detail": "You can only create staff in your own organization."}, status=status.HTTP_403_FORBIDDEN)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        all_loc_ids = location_ids or ([location_id] if location_id else [])
        valid_locs = list(
            Location.objects.filter(pk__in=all_loc_ids, organization_id=organization_id).values_list("pk", flat=True)
        ) if all_loc_ids else []

        if caller_is_manager and not caller_is_admin:
            caller_loc_ids = set(
                str(lid) for lid in StaffAssignment.objects.filter(
                    user=user, role=StaffRole.MANAGER,
                    organization_id=organization_id, location__isnull=False,
                ).values_list("location_id", flat=True)
            )
            caller_org_wide = StaffAssignment.objects.filter(
                user=user, role=StaffRole.MANAGER,
                organization_id=organization_id, location__isnull=True,
            ).exists()

            if not caller_org_wide:
                for lid in valid_locs:
                    if str(lid) not in caller_loc_ids:
                        return Response(
                            {"detail": "You can only assign staff to locations you manage."},
                            status=status.HTTP_403_FORBIDDEN,
                        )

        if role in SINGLE_LOCATION_ROLES and len(valid_locs) > 1:
            return Response(
                {"detail": f"{role} can only be assigned to one location at a time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_platform_admin:
            try:
                org_obj = Organization.objects.get(pk=organization_id)
                current_staff = (
                    StaffAssignment.objects.filter(organization_id=organization_id)
                    .values("user")
                    .distinct()
                    .count()
                )
                check_limit(org_obj, "max_staff", current_staff)
            except Organization.DoesNotExist:
                pass
            except PlanLimitError as e:
                return Response(
                    {"detail": str(e), "limit_key": e.limit_key, "current": e.current, "maximum": e.maximum},
                    status=status.HTTP_402_PAYMENT_REQUIRED,
                )

        new_user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        if role in SINGLE_LOCATION_ROLES and valid_locs:
            assignment = StaffAssignment.objects.create(
                user=new_user,
                organization_id=organization_id,
                location_id=valid_locs[0],
                role=role,
            )
        elif role == StaffRole.MANAGER and valid_locs:
            assignment = None
            for lid in valid_locs:
                a = StaffAssignment.objects.create(
                    user=new_user,
                    organization_id=organization_id,
                    location_id=lid,
                    role=role,
                )
                if assignment is None:
                    assignment = a
        else:
            assignment = StaffAssignment.objects.create(
                user=new_user,
                organization_id=organization_id,
                location=None,
                role=role,
            )

        return Response(
            {
                "id": str(assignment.id),
                "user": new_user.pk,
                "user_email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "organization": str(assignment.organization_id),
                "role": assignment.role,
                "locations": [str(lid) for lid in valid_locs],
            },
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def patch(self, request):
        """Edit a staff member's profile (name, role) and optionally reset password."""
        user = request.user
        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_platform_admin:
            allowed_org_ids = None
        else:
            allowed_org_ids = _caller_manager_org_ids(user)
            if not allowed_org_ids:
                return Response(
                    {"detail": "Only organization admins or managers can edit staff."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            target = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if target.pk == user.pk:
            return Response({"detail": "You cannot edit yourself through this endpoint."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_platform_admin and not user.is_platform_admin:
            return Response({"detail": "Cannot edit a platform admin."}, status=status.HTTP_403_FORBIDDEN)

        assignment_qs = StaffAssignment.objects.filter(user=target)
        if allowed_org_ids is not None:
            assignment_qs = assignment_qs.filter(organization_id__in=allowed_org_ids)
        if not assignment_qs.exists():
            return Response({"detail": "User not found in your organization."}, status=status.HTTP_404_NOT_FOUND)

        first_org_id = assignment_qs.values_list("organization_id", flat=True).first()
        if not _can_manage_target(user, target, first_org_id):
            return Response(
                {"detail": "You do not have permission to edit this staff member."},
                status=status.HTTP_403_FORBIDDEN,
            )

        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        password = request.data.get("password")
        new_role = request.data.get("role")

        user_fields = []
        if first_name is not None:
            target.first_name = first_name.strip()
            user_fields.append("first_name")
        if last_name is not None:
            target.last_name = last_name.strip()
            user_fields.append("last_name")
        if password:
            if len(password) < 8:
                return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
            target.set_password(password)
            user_fields.extend(["password"])
        if user_fields:
            target.save(update_fields=user_fields)

        if new_role and new_role in StaffRole.values:
            if not user.is_platform_admin:
                caller_is_admin = bool(
                    StaffAssignment.objects.filter(
                        user=user, organization_id=first_org_id,
                        role=StaffRole.ORG_ADMIN, location__isnull=True,
                    ).exists()
                )
                if not caller_is_admin and new_role not in OPERATIONAL_ROLES:
                    return Response(
                        {"detail": "Managers can only assign operational roles (waiter, kitchen, host)."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            org_ids = list(assignment_qs.values_list("organization_id", flat=True).distinct())
            for org_id in org_ids:
                org_assignments = StaffAssignment.objects.filter(
                    user=target, organization_id=org_id,
                )
                old_role = org_assignments.first().role if org_assignments.exists() else None
                if old_role and old_role != new_role:
                    if new_role in SINGLE_LOCATION_ROLES:
                        loc_assignments = org_assignments.filter(location__isnull=False)
                        if loc_assignments.count() > 1:
                            keep = loc_assignments.first()
                            loc_assignments.exclude(pk=keep.pk).delete()
                        org_assignments.update(role=new_role)
                    elif new_role == StaffRole.MANAGER:
                        org_assignments.update(role=new_role)
                    elif new_role == StaffRole.ORG_ADMIN:
                        org_assignments.filter(location__isnull=False).delete()
                        org_level = org_assignments.filter(location__isnull=True).first()
                        if org_level:
                            org_level.role = new_role
                            org_level.save(update_fields=["role", "updated_at"])
                        else:
                            StaffAssignment.objects.create(
                                user=target, organization_id=org_id,
                                location=None, role=new_role,
                            )

        first_assignment = assignment_qs.first()
        return Response({
            "user_id": target.pk,
            "email": target.email,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "role": first_assignment.role if first_assignment else new_role,
        })

    def delete(self, request):
        user = request.user
        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_platform_admin:
            allowed_org_ids = None
        else:
            allowed_org_ids = _caller_manager_org_ids(user)
            if not allowed_org_ids:
                return Response({"detail": "Only organization admins or managers can remove staff."}, status=status.HTTP_403_FORBIDDEN)

        try:
            target = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if target.pk == user.pk:
            return Response({"detail": "You cannot remove yourself."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_platform_admin:
            return Response({"detail": "Cannot remove a platform admin."}, status=status.HTTP_403_FORBIDDEN)

        if allowed_org_ids is not None:
            qs = StaffAssignment.objects.filter(user=target, organization_id__in=allowed_org_ids)
        else:
            qs = StaffAssignment.objects.filter(user=target)

        first_org_id = qs.values_list("organization_id", flat=True).first()
        if first_org_id and not _can_manage_target(user, target, first_org_id):
            return Response(
                {"detail": "You do not have permission to remove this staff member."},
                status=status.HTTP_403_FORBIDDEN,
            )

        removed = qs.count()
        qs.delete()

        remaining = StaffAssignment.objects.filter(user=target).exists()
        if not remaining:
            target.is_active = False
            target.save(update_fields=["is_active"])

        return Response(
            {"removed_assignments": removed, "user_deactivated": not remaining},
            status=status.HTTP_200_OK,
        )


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    filterset_fields = ("location", "user")

    def get_queryset(self):
        user = self.request.user
        qs = Shift.objects.select_related("user", "location", "location__organization")
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
            return Shift.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        loc = serializer.validated_data.get("location")
        if loc and not user_has_role_for_location(self.request.user, loc.pk if hasattr(loc, "pk") else loc, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage shifts.")
        serializer.save()

    def perform_update(self, serializer):
        shift = serializer.instance
        if not user_has_role_for_location(self.request.user, shift.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage shifts.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_has_role_for_location(self.request.user, instance.location_id, ADMIN_MANAGER_ROLES):
            raise PermissionDenied("Only admins and managers can manage shifts.")
        instance.delete()
