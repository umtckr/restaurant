from django.utils import timezone

from apps.subscriptions.models import Subscription, SubscriptionStatus


class PlanLimitError(Exception):
    def __init__(self, message, limit_key=None, current=None, maximum=None):
        super().__init__(message)
        self.limit_key = limit_key
        self.current = current
        self.maximum = maximum


def get_active_subscription(organization) -> Subscription | None:
    try:
        sub = organization.subscription
    except Subscription.DoesNotExist:
        return None
    if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
        if sub.status == SubscriptionStatus.TRIALING and sub.trial_end:
            if timezone.now() > sub.trial_end:
                sub.status = SubscriptionStatus.EXPIRED
                sub.save(update_fields=["status", "updated_at"])
                return None
        return sub
    return None


def check_limit(organization, limit_field: str, current_count: int):
    sub = get_active_subscription(organization)
    if sub is None:
        raise PlanLimitError(
            "No active subscription. Please subscribe to a plan.",
            limit_key=limit_field,
        )
    maximum = sub.get_limit(limit_field)
    if maximum == 0:
        return
    if current_count >= maximum:
        raise PlanLimitError(
            f"Plan limit reached: {limit_field.replace('max_', '').replace('_', ' ')} "
            f"({current_count}/{maximum}). Upgrade your plan or contact support.",
            limit_key=limit_field,
            current=current_count,
            maximum=maximum,
        )


def check_feature(organization, feature_name: str):
    sub = get_active_subscription(organization)
    if sub is None:
        raise PlanLimitError("No active subscription.", limit_key=feature_name)
    if not sub.has_feature(feature_name):
        raise PlanLimitError(
            "This feature is not available on your current plan. Upgrade to access it.",
            limit_key=feature_name,
        )


def check_monthly_orders(organization):
    from apps.orders.models import Order

    sub = get_active_subscription(organization)
    if sub is None:
        raise PlanLimitError(
            "No active subscription.", limit_key="max_orders_per_month",
        )
    limit = sub.get_limit("max_orders_per_month")
    if limit == 0:
        return
    now = timezone.now()
    count = (
        Order.objects.filter(
            organization=organization,
            created_at__year=now.year,
            created_at__month=now.month,
        )
        .exclude(status="cancelled")
        .count()
    )
    if count >= limit:
        raise PlanLimitError(
            f"Monthly order limit reached ({count}/{limit}). Upgrade your plan.",
            limit_key="max_orders_per_month",
            current=count,
            maximum=limit,
        )


def get_subscription_summary(organization) -> dict:
    """Return current plan limits and usage for the organization."""
    from apps.locations.models import Location, Table
    from apps.menus.models import Menu
    from apps.orders.models import Order
    from apps.staff.models import StaffAssignment

    sub = get_active_subscription(organization)
    if sub is None:
        return {"has_subscription": False}

    now = timezone.now()
    monthly_orders = (
        Order.objects.filter(
            organization=organization,
            created_at__year=now.year,
            created_at__month=now.month,
        )
        .exclude(status="cancelled")
        .count()
    )

    location_count = Location.objects.filter(organization=organization).count()
    table_count = Table.objects.filter(location__organization=organization).count()
    staff_count = (
        StaffAssignment.objects.filter(organization=organization)
        .values("user")
        .distinct()
        .count()
    )
    menu_count = Menu.objects.filter(
        organization=organization, is_archived=False,
    ).count()

    return {
        "has_subscription": True,
        "plan_name": sub.plan.name,
        "plan_slug": sub.plan.slug,
        "status": sub.status,
        "billing_cycle": sub.billing_cycle,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "limits": {
            "locations": {"current": location_count, "max": sub.get_limit("max_locations")},
            "tables": {"current": table_count, "max": sub.get_limit("max_tables")},
            "staff": {"current": staff_count, "max": sub.get_limit("max_staff")},
            "menus": {"current": menu_count, "max": sub.get_limit("max_menus")},
            "orders_this_month": {"current": monthly_orders, "max": sub.get_limit("max_orders_per_month")},
        },
        "features": {
            "has_discounts": sub.has_feature("has_discounts"),
            "has_bill_splitting": sub.has_feature("has_bill_splitting"),
            "has_online_payments": sub.has_feature("has_online_payments"),
            "has_full_reports": sub.has_feature("has_full_reports"),
            "has_custom_branding": sub.has_feature("has_custom_branding"),
            "has_white_label": sub.has_feature("has_white_label"),
        },
        "allowed_payment_methods": sub.get_limit("allowed_payment_methods") or sub.plan.allowed_payment_methods,
        "online_payment_fee_percent": str(
            sub.get_limit("online_payment_fee_percent") or sub.plan.online_payment_fee_percent
        ),
        "custom_overrides": sub.custom_overrides,
    }
