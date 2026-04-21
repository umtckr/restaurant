from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.subscriptions.views import (
    MySubscriptionView,
    PlanAdminViewSet,
    PlanPublicView,
    SubscriptionAdminViewSet,
)

router = DefaultRouter()
router.register("admin/plans", PlanAdminViewSet, basename="admin-plan")
router.register("admin/subscriptions", SubscriptionAdminViewSet, basename="admin-subscription")

urlpatterns = [
    path("plans/public/", PlanPublicView.as_view(), name="plans-public"),
    path("my-subscription/", MySubscriptionView.as_view(), name="my-subscription"),
] + router.urls
