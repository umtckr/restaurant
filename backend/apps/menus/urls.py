from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.menus.views import (
    CategoryViewSet,
    MenuItemModifierViewSet,
    MenuItemViewSet,
    MenuLocationViewSet,
    MenuPublicView,
    MenuViewSet,
)

router = DefaultRouter()
router.register("menus", MenuViewSet, basename="menu")
router.register("menu-locations", MenuLocationViewSet, basename="menulocation")
router.register("menu-categories", CategoryViewSet, basename="category")
router.register("menu-items", MenuItemViewSet, basename="menuitem")
router.register("menu-item-modifiers", MenuItemModifierViewSet, basename="menuitemmodifier")

urlpatterns = [
    path(
        "menus/public/<uuid:location_id>/",
        MenuPublicView.as_view(),
        name="menu-public",
    ),
] + router.urls
