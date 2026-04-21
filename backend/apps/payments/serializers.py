from decimal import Decimal

from rest_framework import serializers

from apps.payments.models import Payment, PaymentAllocation


class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = ("id", "order", "amount")
        read_only_fields = ("id",)


class PaymentSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "organization",
            "location",
            "amount",
            "currency",
            "status",
            "method",
            "session",
            "received_by",
            "notes",
            "gateway",
            "gateway_payment_id",
            "idempotency_key",
            "metadata",
            "allocations",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "gateway_payment_id",
            "allocations",
            "created_at",
            "updated_at",
        )


class PaymentCreateSerializer(serializers.Serializer):
    """Stub payment: records intent + allocations (integrate PSP later)."""

    location = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, default="TRY")
    method = serializers.CharField(max_length=32, default="cash", required=False)
    session = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(max_length=128, required=False, allow_blank=True)
    allocations = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        min_length=1,
    )

    def validate_allocations(self, value):
        total = Decimal("0")
        for row in value:
            oid = row.get("order_id")
            amt = row.get("amount")
            if not oid or amt is None:
                raise serializers.ValidationError("Each row needs order_id and amount.")
            total += Decimal(str(amt))
        self._alloc_total = total
        return value

    def validate(self, attrs):
        if attrs["amount"] != self._alloc_total:
            raise serializers.ValidationError(
                {"amount": "Must equal sum of allocation amounts."}
            )
        return attrs
