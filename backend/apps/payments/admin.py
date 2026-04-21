from django.contrib import admin

from apps.payments.models import Payment, PaymentAllocation


class AllocationInline(admin.TabularInline):
    model = PaymentAllocation
    extra = 0


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "amount", "currency", "status", "created_at")
    list_filter = ("status", "location")
    inlines = [AllocationInline]
