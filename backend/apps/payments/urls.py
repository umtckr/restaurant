from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.payments.views import PaymentCreateView, PaymentViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("payments/stub-create/", PaymentCreateView.as_view(), name="payment-stub-create"),
] + router.urls
