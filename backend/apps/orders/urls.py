from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.orders.views import (
    BillSplitViewSet,
    CustomerCreateOrderView,
    CustomerRequestCreateView,
    CustomerRequestViewSet,
    DiscountViewSet,
    GuestOrdersView,
    GuestValidateDiscountView,
    OrderViewSet,
)

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("customer-requests", CustomerRequestViewSet, basename="customerrequest")
router.register("discounts", DiscountViewSet, basename="discount")
router.register("bill-splits", BillSplitViewSet, basename="billsplit")

urlpatterns = [
    path("orders/customer-create/", CustomerCreateOrderView.as_view()),
    path("orders/guest/", GuestOrdersView.as_view()),
    path("customer-requests/customer-create/", CustomerRequestCreateView.as_view()),
    path("discounts/guest-validate/", GuestValidateDiscountView.as_view()),
] + router.urls
