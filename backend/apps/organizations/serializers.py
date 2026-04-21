from rest_framework import serializers

from apps.organizations.models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "is_active",
            "onboarding_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if not (request and getattr(request.user, "is_platform_admin", False)):
            validated_data.pop("onboarding_status", None)
            validated_data.pop("slug", None)
        return super().update(instance, validated_data)
