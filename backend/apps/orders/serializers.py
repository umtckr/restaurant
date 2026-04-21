from rest_framework import serializers

from apps.orders.models import BillSplit, BillSplitPortion, CustomerRequest, Discount, Order, OrderActivityLog, OrderLine


class OrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLine
        fields = (
            "id",
            "menu_item",
            "name_snapshot",
            "unit_price",
            "quantity",
            "modifiers_snapshot",
            "line_subtotal",
            "tax_snapshot",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True, default="")
    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=""
    )
    table_label = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    discount_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "organization",
            "organization_name",
            "location",
            "location_name",
            "dining_session",
            "table_label",
            "customer",
            "customer_display",
            "channel",
            "status",
            "guest_email",
            "guest_phone",
            "discount",
            "discount_amount",
            "subtotal",
            "tax_amount",
            "service_charge_amount",
            "tip_amount",
            "total",
            "notes",
            "items_count",
            "discount_code",
            "lines",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "discount",
            "discount_amount",
            "subtotal",
            "tax_amount",
            "service_charge_amount",
            "total",
            "created_at",
            "updated_at",
        )

    def get_table_label(self, obj):
        ds = obj.dining_session
        if ds and hasattr(ds, "table"):
            return ds.table.label if ds.table else None
        return None

    def get_customer_display(self, obj):
        if obj.customer:
            u = obj.customer
            name = f"{u.first_name} {u.last_name}".strip()
            return name or u.email
        if obj.guest_email:
            return obj.guest_email
        return None

    def get_items_count(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "lines" in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache["lines"])
        return obj.lines.count()


class OrderActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderActivityLog
        fields = (
            "id",
            "order",
            "old_status",
            "new_status",
            "changed_by",
            "actor_label",
            "note",
            "created_at",
        )
        read_only_fields = fields


class CustomerRequestSerializer(serializers.ModelSerializer):
    table_label = serializers.SerializerMethodField()
    session_total = serializers.SerializerMethodField()

    class Meta:
        model = CustomerRequest
        fields = (
            "id",
            "dining_session",
            "request_type",
            "status",
            "note",
            "table_label",
            "session_total",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_table_label(self, obj):
        ds = obj.dining_session
        if ds and hasattr(ds, "table"):
            return ds.table.label if ds.table else None
        return None

    def get_session_total(self, obj):
        from decimal import Decimal

        ds = obj.dining_session
        if not ds:
            return None
        total = Decimal("0")
        for order in ds.orders.exclude(status="cancelled"):
            total += order.total
        return str(total.quantize(Decimal("0.01")))


class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = (
            "id", "organization", "code", "description", "discount_type", "value",
            "min_order_amount", "max_discount_amount", "max_uses", "times_used",
            "locations", "is_active", "valid_from", "valid_until",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "times_used", "created_at", "updated_at")


class BillSplitPortionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillSplitPortion
        fields = ("id", "label", "amount", "is_paid", "paid_at", "payment", "created_at")
        read_only_fields = ("id", "created_at")


class BillSplitSerializer(serializers.ModelSerializer):
    portions = BillSplitPortionSerializer(many=True, read_only=True)

    class Meta:
        model = BillSplit
        fields = ("id", "dining_session", "method", "total_amount", "num_guests", "portions", "created_at")
        read_only_fields = ("id", "created_at")
