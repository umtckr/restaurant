from rest_framework import serializers

from apps.subscriptions.models import Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class PlanPublicSerializer(serializers.ModelSerializer):
    """Exposed on the public pricing page — no internal fields."""

    class Meta:
        model = Plan
        fields = (
            "id", "name", "slug", "description", "sort_order",
            "monthly_price", "annual_price", "currency",
            "max_locations", "max_tables", "max_staff", "max_menus",
            "max_orders_per_month",
            "has_discounts", "has_bill_splitting", "has_online_payments",
            "has_full_reports", "has_custom_branding", "has_white_label",
            "allowed_payment_methods", "online_payment_fee_percent",
            "trial_days", "is_featured",
        )


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_slug = serializers.CharField(source="plan.slug", read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id", "organization", "plan", "plan_name", "plan_slug",
            "status", "billing_cycle",
            "trial_start", "trial_end",
            "current_period_start", "current_period_end",
            "custom_overrides", "cancelled_at", "changed_by",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class SubscriptionAdminWriteSerializer(serializers.Serializer):
    organization = serializers.UUIDField()
    plan = serializers.UUIDField()
    status = serializers.ChoiceField(
        choices=["trialing", "active", "past_due", "cancelled", "expired"],
        required=False,
    )
    billing_cycle = serializers.ChoiceField(
        choices=["monthly", "annual"], required=False,
    )
    trial_days = serializers.IntegerField(required=False, min_value=0)
    custom_overrides = serializers.JSONField(required=False)
