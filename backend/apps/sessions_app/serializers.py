from rest_framework import serializers

from apps.sessions_app.models import DiningSession


class DiningSessionSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    organization_name = serializers.CharField(
        source="location.organization.name", read_only=True, default=""
    )
    table_label = serializers.CharField(source="table.label", read_only=True)

    class Meta:
        model = DiningSession
        fields = (
            "id",
            "location",
            "location_name",
            "organization_name",
            "table",
            "table_label",
            "token",
            "status",
            "closed_at",
            "closed_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "token",
            "status",
            "closed_at",
            "closed_by",
            "created_at",
            "updated_at",
        )


class DiningSessionPublicSerializer(serializers.ModelSerializer):
    location_id = serializers.UUIDField(read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True, default="")
    organization_name = serializers.CharField(
        source="location.organization.name", read_only=True, default=""
    )
    organization_logo = serializers.URLField(
        source="location.organization.logo", read_only=True, default=""
    )
    organization_color = serializers.CharField(
        source="location.organization.primary_color", read_only=True, default=""
    )
    table_label = serializers.CharField(source="table.label", read_only=True)
    currency_code = serializers.CharField(
        source="location.currency_code", read_only=True, default="TRY"
    )
    tip_mode = serializers.CharField(
        source="location.tip_mode", read_only=True, default="off"
    )
    tip_presets_percent = serializers.JSONField(
        source="location.tip_presets_percent", read_only=True, default=list
    )

    class Meta:
        model = DiningSession
        fields = (
            "id",
            "location_id",
            "location_name",
            "organization_name",
            "organization_logo",
            "organization_color",
            "table_label",
            "status",
            "token",
            "currency_code",
            "tip_mode",
            "tip_presets_percent",
        )
