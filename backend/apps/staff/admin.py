from django.contrib import admin

from apps.staff.models import Shift, StaffAssignment


@admin.register(StaffAssignment)
class StaffAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "location", "role")
    list_filter = ("organization", "location", "role")


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "starts_at", "ends_at")
    list_filter = ("location",)
