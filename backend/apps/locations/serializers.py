from rest_framework import serializers

from apps.locations.models import Location, Table, Zone


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = (
            "id",
            "location",
            "name",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TableSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True, default="")

    class Meta:
        model = Table
        fields = (
            "id",
            "location",
            "zone",
            "zone_name",
            "label",
            "capacity",
            "sort_order",
            "map_x",
            "map_y",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = (
            "id",
            "organization",
            "name",
            "slug",
            "address_line1",
            "address_line2",
            "city",
            "country",
            "currency_code",
            "timezone",
            "is_active",
            "tip_mode",
            "tip_presets_percent",
            "service_charge_enabled",
            "service_charge_apply",
            "service_charge_percent",
            "tax_rate_percent",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
