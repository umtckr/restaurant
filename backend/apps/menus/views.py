from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations.models import Location
from apps.menus.models import Category, Menu, MenuItem, MenuItemModifier, MenuLocation
from apps.menus.serializers import (
    CategorySerializer,
    MenuDetailSerializer,
    MenuItemModifierSerializer,
    MenuItemSerializer,
    MenuLocationSerializer,
    MenuSerializer,
)
from apps.organizations.models import OrganizationOnboardingStatus
from apps.staff.models import StaffAssignment, StaffRole
from apps.staff.utils import user_has_role_for_org, user_location_ids
from apps.subscriptions.services import PlanLimitError, check_limit


class PaymentRequired(APIException):
    status_code = 402
    default_detail = "Plan limit reached."

ADMIN_MANAGER_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER]


def _menu_ids_for_user(user):
    if user.is_platform_admin:
        return None
    org_ids = list(
        StaffAssignment.objects.filter(user=user)
        .values_list("organization_id", flat=True)
        .distinct()
    )
    if not org_ids:
        return []
    return list(
        Menu.objects.filter(
            organization_id__in=org_ids,
            organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE,
        ).values_list("id", flat=True)
    )


def _check_menu_write_permission(user, menu):
    from rest_framework.exceptions import PermissionDenied
    if getattr(user, "is_platform_admin", False):
        return
    if not user_has_role_for_org(user, menu.organization_id, ADMIN_MANAGER_ROLES):
        raise PermissionDenied("Only admins and managers can edit menus.")


class MenuViewSet(viewsets.ModelViewSet):
    serializer_class = MenuSerializer
    filterset_fields = ("organization", "is_archived")

    def get_queryset(self):
        user = self.request.user
        qs = Menu.objects.all()
        ids = _menu_ids_for_user(user)
        if ids is None:
            return qs
        if not ids:
            return Menu.objects.none()
        return qs.filter(pk__in=ids)

    def perform_create(self, serializer):
        org = serializer.validated_data.get("organization")
        if org and not user_has_role_for_org(self.request.user, org.pk if hasattr(org, "pk") else org, ADMIN_MANAGER_ROLES):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and managers can create menus.")
        if org and not getattr(self.request.user, "is_platform_admin", False):
            try:
                org_obj = org if hasattr(org, "pk") else None
                if org_obj:
                    current = Menu.objects.filter(organization=org_obj, is_archived=False).count()
                    check_limit(org_obj, "max_menus", current)
            except PlanLimitError as e:
                raise PaymentRequired(detail=str(e))
        serializer.save()

    def perform_update(self, serializer):
        _check_menu_write_permission(self.request.user, serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        _check_menu_write_permission(self.request.user, instance)
        instance.delete()


class MenuLocationViewSet(viewsets.ModelViewSet):
    serializer_class = MenuLocationSerializer
    filterset_fields = ("menu", "location", "is_active")

    def get_queryset(self):
        user = self.request.user
        qs = MenuLocation.objects.select_related("menu", "location", "location__organization")
        if user.is_platform_admin:
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
            return MenuLocation.objects.none()
        return qs.filter(q)

    def _deactivate_others(self, location, exclude_pk=None):
        """Ensure only one active menu per location by deactivating others."""
        qs = MenuLocation.objects.filter(location=location, is_active=True)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        qs.update(is_active=False)

    def perform_create(self, serializer):
        menu = serializer.validated_data.get("menu")
        if menu:
            _check_menu_write_permission(self.request.user, menu)
        location = serializer.validated_data.get("location")
        is_active = serializer.validated_data.get("is_active", True)
        if is_active and location:
            self._deactivate_others(location)
        serializer.save()

    def perform_update(self, serializer):
        _check_menu_write_permission(self.request.user, serializer.instance.menu)
        is_active = serializer.validated_data.get("is_active")
        if is_active is True:
            self._deactivate_others(
                serializer.instance.location, exclude_pk=serializer.instance.pk
            )
        serializer.save()

    def perform_destroy(self, instance):
        _check_menu_write_permission(self.request.user, instance.menu)
        instance.delete()


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    filterset_fields = ("menu",)

    def get_queryset(self):
        user = self.request.user
        base = Category.objects.select_related("menu")
        ids = _menu_ids_for_user(user)
        if ids is None:
            return base.all()
        if not ids:
            return Category.objects.none()
        return base.filter(menu_id__in=ids)

    def perform_create(self, serializer):
        menu = serializer.validated_data.get("menu")
        if menu:
            _check_menu_write_permission(self.request.user, menu)
        serializer.save()

    def perform_update(self, serializer):
        _check_menu_write_permission(self.request.user, serializer.instance.menu)
        serializer.save()

    def perform_destroy(self, instance):
        _check_menu_write_permission(self.request.user, instance.menu)
        instance.delete()


class MenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    filterset_fields = ("category",)

    def get_queryset(self):
        user = self.request.user
        base = MenuItem.objects.select_related("category__menu")
        ids = _menu_ids_for_user(user)
        if ids is None:
            return base.all()
        if not ids:
            return MenuItem.objects.none()
        return base.filter(category__menu_id__in=ids)

    def perform_create(self, serializer):
        cat = serializer.validated_data.get("category")
        if cat:
            _check_menu_write_permission(self.request.user, cat.menu)
        serializer.save()

    def perform_update(self, serializer):
        _check_menu_write_permission(self.request.user, serializer.instance.category.menu)
        if "image" in self.request.data and self.request.data["image"] == "":
            instance = serializer.instance
            if instance.image:
                instance.image.delete(save=False)
            instance.image = None
            instance.save(update_fields=["image"])
            serializer.validated_data.pop("image", None)
            return
        serializer.save()

    def perform_destroy(self, instance):
        _check_menu_write_permission(self.request.user, instance.category.menu)
        instance.delete()


class MenuItemModifierViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemModifierSerializer
    filterset_fields = ("menu_item",)

    def get_queryset(self):
        user = self.request.user
        base = MenuItemModifier.objects.select_related("menu_item__category__menu")
        ids = _menu_ids_for_user(user)
        if ids is None:
            return base.all()
        if not ids:
            return MenuItemModifier.objects.none()
        return base.filter(menu_item__category__menu_id__in=ids)

    def perform_create(self, serializer):
        mi = serializer.validated_data.get("menu_item")
        if mi:
            _check_menu_write_permission(self.request.user, mi.category.menu)
        serializer.save()

    def perform_update(self, serializer):
        _check_menu_write_permission(self.request.user, serializer.instance.menu_item.category.menu)
        serializer.save()

    def perform_destroy(self, instance):
        _check_menu_write_permission(self.request.user, instance.menu_item.category.menu)
        instance.delete()


class MenuPublicView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, location_id):
        loc = Location.objects.select_related("organization").filter(pk=location_id).first()
        if not loc or loc.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response({"detail": "Location not found."}, status=404)
        ml = (
            MenuLocation.objects.filter(location_id=location_id, is_active=True)
            .select_related("menu")
            .first()
        )
        if not ml:
            return Response({"detail": "No active menu for this location."}, status=404)
        menu = Menu.objects.prefetch_related(
            "categories__items__modifiers"
        ).get(pk=ml.menu_id)
        return Response(MenuDetailSerializer(menu, context={"request": request}).data)
