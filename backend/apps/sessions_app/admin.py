from django.contrib import admin

from apps.sessions_app.models import DiningSession


@admin.register(DiningSession)
class DiningSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "table", "status", "created_at", "closed_at")
    list_filter = ("status", "location")
