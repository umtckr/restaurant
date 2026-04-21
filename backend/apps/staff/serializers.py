from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.locations.models import Location
from apps.staff.models import Shift, StaffAssignment, StaffRole

User = get_user_model()


class StaffAssignmentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True, default="")
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = StaffAssignment
        fields = (
            "id",
            "user",
            "user_email",
            "user_first_name",
            "user_last_name",
            "organization",
            "location",
            "location_name",
            "role",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    SINGLE_LOCATION_ROLES = (StaffRole.WAITER, StaffRole.KITCHEN, StaffRole.HOST)

    def validate(self, attrs):
        inst = self.instance
        loc = attrs["location"] if "location" in attrs else (getattr(inst, "location", None) if inst else None)
        role = attrs["role"] if "role" in attrs else (getattr(inst, "role", None) if inst else None)
        user = attrs.get("user") or (inst.user if inst else None)
        org = attrs.get("organization") or (inst.organization if inst else None)

        if loc is None and role not in (StaffRole.ORG_ADMIN, StaffRole.MANAGER):
            raise serializers.ValidationError(
                {"location": "Waiter, kitchen, and host roles require a location."}
            )

        if role in self.SINGLE_LOCATION_ROLES and loc is not None and user and org:
            existing = StaffAssignment.objects.filter(
                user=user, organization=org, location__isnull=False,
            ).exclude(pk=inst.pk if inst else None)
            if existing.exists():
                raise serializers.ValidationError(
                    {"location": f"{role} can only be assigned to one location. Remove the existing assignment first or use reassign."}
                )

        return attrs


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = (
            "id",
            "user",
            "location",
            "starts_at",
            "ends_at",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
