from apps.staff.models import StaffAssignment, StaffRole


def user_organization_ids(user):
    if not user.is_authenticated:
        return []
    if getattr(user, "is_platform_admin", False):
        return None
    return list(
        StaffAssignment.objects.filter(user=user)
        .values_list("organization_id", flat=True)
        .distinct()
    )


def user_location_ids(user):
    if not user.is_authenticated:
        return []
    if getattr(user, "is_platform_admin", False):
        return None
    return list(
        StaffAssignment.objects.filter(user=user, location_id__isnull=False).values_list(
            "location_id", flat=True
        )
    )


def user_can_access_location(user, location_id) -> bool:
    lids = user_location_ids(user)
    if lids is None:
        return True
    if str(location_id) in {str(x) for x in lids}:
        return True
    from apps.locations.models import Location

    loc = Location.objects.filter(pk=location_id).values("organization_id").first()
    if not loc:
        return False
    oid = loc["organization_id"]
    return StaffAssignment.objects.filter(
        user=user,
        organization_id=oid,
        location__isnull=True,
        role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
    ).exists()


def user_has_role_for_location(user, location_id, allowed_roles) -> bool:
    """
    Check that the user has one of `allowed_roles` that covers `location_id`.
    Platform admins always pass.
    """
    if not user.is_authenticated:
        return False
    if getattr(user, "is_platform_admin", False):
        return True

    role_set = set(allowed_roles)

    if StaffAssignment.objects.filter(
        user=user, location_id=location_id, role__in=role_set,
    ).exists():
        return True

    from apps.locations.models import Location
    loc = Location.objects.filter(pk=location_id).values("organization_id").first()
    if not loc:
        return False
    return StaffAssignment.objects.filter(
        user=user,
        organization_id=loc["organization_id"],
        location__isnull=True,
        role__in=role_set,
    ).exists()


def user_has_role_for_org(user, org_id, allowed_roles) -> bool:
    """Check that the user has one of `allowed_roles` in the given organization."""
    if not user.is_authenticated:
        return False
    if getattr(user, "is_platform_admin", False):
        return True
    return StaffAssignment.objects.filter(
        user=user, organization_id=org_id, role__in=set(allowed_roles),
    ).exists()
