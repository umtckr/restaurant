from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.organizations.models import Organization


class Plan(UUIDModel, TimeStampedModel):
    name = models.CharField(max_length=64)
    slug = models.SlugField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    annual_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="TRY")

    max_locations = models.PositiveIntegerField(default=1)
    max_tables = models.PositiveIntegerField(default=10)
    max_staff = models.PositiveIntegerField(default=3)
    max_menus = models.PositiveIntegerField(default=1)
    max_orders_per_month = models.PositiveIntegerField(default=500, help_text="0 = unlimited")

    has_discounts = models.BooleanField(default=False)
    has_bill_splitting = models.BooleanField(default=False)
    has_online_payments = models.BooleanField(default=False)
    has_full_reports = models.BooleanField(default=False)
    has_custom_branding = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)

    allowed_payment_methods = models.JSONField(
        default=list, blank=True,
        help_text='e.g. ["cash","card_terminal","online"]',
    )
    online_payment_fee_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Fee % on online transactions",
    )
    trial_days = models.PositiveIntegerField(default=14)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False, help_text="Highlighted on pricing page")

    class Meta:
        db_table = "subscriptions_plan"
        ordering = ["sort_order", "monthly_price"]

    def __str__(self):
        return self.name


class SubscriptionStatus(models.TextChoices):
    TRIALING = "trialing", "Trialing"
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past due"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"


class BillingCycle(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    ANNUAL = "annual", "Annual"


class Subscription(UUIDModel, TimeStampedModel):
    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="subscription",
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(
        max_length=16, choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIALING,
    )
    billing_cycle = models.CharField(
        max_length=16, choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
    )
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)

    custom_overrides = models.JSONField(
        default=dict, blank=True,
        help_text="Override any plan limit for this org. Keys match Plan field names.",
    )

    cancelled_at = models.DateTimeField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    class Meta:
        db_table = "subscriptions_subscription"

    def __str__(self):
        return f"{self.organization.name} — {self.plan.name} ({self.status})"

    def get_limit(self, field_name: str):
        if field_name in self.custom_overrides:
            return self.custom_overrides[field_name]
        return getattr(self.plan, field_name, None)

    def has_feature(self, feature_name: str) -> bool:
        if feature_name in self.custom_overrides:
            return bool(self.custom_overrides[feature_name])
        return getattr(self.plan, feature_name, False)
