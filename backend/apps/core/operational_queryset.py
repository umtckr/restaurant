"""Filter querysets so non–platform-admin users only see active-tenant operational data."""

from apps.organizations.models import OrganizationOnboardingStatus


def active_organization_filter(prefix: str = "organization") -> dict:
    return {f"{prefix}__onboarding_status": OrganizationOnboardingStatus.ACTIVE}


def filter_for_active_organization(queryset, user, org_path: str = "organization"):
    if not user.is_authenticated or getattr(user, "is_platform_admin", False):
        return queryset
    return queryset.filter(**active_organization_filter(org_path))


def filter_location_queryset_for_active_org(queryset, user):
    if not user.is_authenticated or getattr(user, "is_platform_admin", False):
        return queryset
    return queryset.filter(
        **active_organization_filter("organization"),
    )
