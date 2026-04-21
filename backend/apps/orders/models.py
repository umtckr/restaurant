from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.locations.models import Location
from apps.menus.models import MenuItem
from apps.organizations.models import Organization
from apps.sessions_app.models import DiningSession


class OrderChannel(models.TextChoices):
    DINE_IN = "dine_in", "Dine-in"
    TAKEAWAY = "takeaway", "Takeaway"
    DELIVERY = "delivery", "Delivery"


class OrderStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    CONFIRMED = "confirmed", "Confirmed"
    IN_KITCHEN = "in_kitchen", "In kitchen"
    READY = "ready", "Ready"
    SERVED = "served", "Served"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class Order(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="orders"
    )
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="orders"
    )
    dining_session = models.ForeignKey(
        DiningSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    channel = models.CharField(max_length=16, choices=OrderChannel.choices)
    status = models.CharField(
        max_length=32, choices=OrderStatus.choices, default=OrderStatus.DRAFT
    )
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=32, blank=True)
    idempotency_key = models.CharField(max_length=128, blank=True, db_index=True)

    discount = models.ForeignKey(
        "Discount", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tip_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notes = models.TextField(blank=True)

    class Meta:
        db_table = "orders_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["location", "status"]),
            models.Index(fields=["dining_session"]),
        ]


class OrderLine(UUIDModel, TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    name_snapshot = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    modifiers_snapshot = models.JSONField(default=list, blank=True)
    line_subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "orders_order_line"


class OrderActivityLog(UUIDModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="activity_logs")
    old_status = models.CharField(max_length=32, blank=True)
    new_status = models.CharField(max_length=32, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    actor_label = models.CharField(max_length=255, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "orders_activity_log"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order_id}: {self.old_status} → {self.new_status}"


class DiscountType(models.TextChoices):
    PERCENTAGE = "percentage", "Percentage"
    FIXED = "fixed", "Fixed amount"


class Discount(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="discounts"
    )
    code = models.CharField(max_length=64, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(
        max_length=16, choices=DiscountType.choices, default=DiscountType.PERCENTAGE
    )
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    locations = models.ManyToManyField(
        "locations.Location", blank=True, related_name="discounts",
    )
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "orders_discount"
        unique_together = [["organization", "code"]]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()} {self.value})"


class CustomerRequestType(models.TextChoices):
    WAITER = "waiter", "Waiter"
    BILL = "bill", "Bill"
    OTHER = "other", "Other"


class CustomerRequestStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    DONE = "done", "Done"


class CustomerRequest(UUIDModel, TimeStampedModel):
    dining_session = models.ForeignKey(
        DiningSession, on_delete=models.CASCADE, related_name="customer_requests"
    )
    request_type = models.CharField(max_length=32, choices=CustomerRequestType.choices)
    status = models.CharField(
        max_length=32,
        choices=CustomerRequestStatus.choices,
        default=CustomerRequestStatus.OPEN,
    )
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "orders_customer_request"
        ordering = ["-created_at"]


class BillSplitMethod(models.TextChoices):
    EQUAL = "equal", "Split equally"
    BY_ITEM = "by_item", "Split by item"
    CUSTOM = "custom", "Custom amounts"


class BillSplit(UUIDModel, TimeStampedModel):
    dining_session = models.ForeignKey(
        DiningSession, on_delete=models.CASCADE, related_name="bill_splits"
    )
    method = models.CharField(
        max_length=16, choices=BillSplitMethod.choices, default=BillSplitMethod.EQUAL
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    num_guests = models.PositiveIntegerField(default=2)

    class Meta:
        db_table = "orders_bill_split"
        ordering = ["-created_at"]


class BillSplitPortion(UUIDModel, TimeStampedModel):
    bill_split = models.ForeignKey(
        BillSplit, on_delete=models.CASCADE, related_name="portions"
    )
    label = models.CharField(max_length=64)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey(
        "payments.Payment", on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_portions"
    )

    class Meta:
        db_table = "orders_bill_split_portion"
        ordering = ["label"]
