from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "is_platform_admin", False))


class IsStaffOfOrganization(BasePermission):
    """Staff user with any assignment in the organization (object must expose organization_id)."""

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if getattr(request.user, "is_platform_admin", False):
            return True
        org_id = getattr(obj, "organization_id", None)
        if org_id is None and hasattr(obj, "organization"):
            org_id = obj.organization_id
        if org_id is None:
            return False
        from apps.staff.models import StaffAssignment

        return StaffAssignment.objects.filter(
            user=request.user, organization_id=org_id
        ).exists()


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in ("GET", "HEAD", "OPTIONS")
