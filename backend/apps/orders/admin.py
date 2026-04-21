from django.contrib import admin

from apps.orders.models import CustomerRequest, Order, OrderLine


class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "channel", "status", "total", "created_at")
    list_filter = ("status", "channel", "location")
    inlines = [OrderLineInline]


@admin.register(CustomerRequest)
class CustomerRequestAdmin(admin.ModelAdmin):
    list_display = ("dining_session", "request_type", "status", "created_at")
    list_filter = ("request_type", "status")
