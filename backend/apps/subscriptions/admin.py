from django.contrib import admin

from apps.subscriptions.models import Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "monthly_price", "annual_price", "is_active", "is_featured", "sort_order")
    list_filter = ("is_active", "is_featured")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("organization", "plan", "status", "billing_cycle", "trial_end")
    list_filter = ("status", "plan")
    raw_id_fields = ("organization", "changed_by")
