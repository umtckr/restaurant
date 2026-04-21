from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.locations.models import Location
from apps.orders.models import Order
from apps.organizations.models import Organization


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    CARD_TERMINAL = "card_terminal", "Card terminal"
    ONLINE = "online", "Online payment"
    OTHER = "other", "Other"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    REQUIRES_ACTION = "requires_action", "Requires action"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"
    PARTIALLY_REFUNDED = "partially_refunded", "Partially refunded"


class Payment(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="payments"
    )
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TRY")
    status = models.CharField(
        max_length=32, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    gateway = models.CharField(max_length=64, blank=True)
    gateway_payment_id = models.CharField(max_length=255, blank=True, db_index=True)
    idempotency_key = models.CharField(
        max_length=128, blank=True, null=True, unique=True
    )
    method = models.CharField(
        max_length=32, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    session = models.ForeignKey(
        "sessions_app.DiningSession", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="payments",
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="received_payments",
    )
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "payments_payment"
        ordering = ["-created_at"]


class PaymentAllocation(UUIDModel, TimeStampedModel):
    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="allocations"
    )
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payment_allocations")
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "payments_payment_allocation"
