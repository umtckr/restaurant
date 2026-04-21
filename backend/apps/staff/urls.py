from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.staff.views import ShiftViewSet, StaffAssignmentViewSet, StaffMemberView

router = DefaultRouter()
router.register("staff-assignments", StaffAssignmentViewSet, basename="staffassignment")
router.register("shifts", ShiftViewSet, basename="shift")

urlpatterns = [
    path("staff-members/", StaffMemberView.as_view(), name="staff-members"),
] + router.urls
