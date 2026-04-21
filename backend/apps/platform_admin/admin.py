from django.contrib import admin

from apps.platform_admin.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "object_type", "object_id", "actor", "created_at")
    list_filter = ("object_type",)
