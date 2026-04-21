from django.contrib import admin

from apps.locations.models import Location, Table


class TableInline(admin.TabularInline):
    model = Table
    extra = 0


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "slug", "city", "is_active")
    list_filter = ("organization", "is_active")
    inlines = [TableInline]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ("label", "location", "capacity", "sort_order")
    list_filter = ("location",)
