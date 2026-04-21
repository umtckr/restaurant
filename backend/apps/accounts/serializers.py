from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.accounts.models import CustomerProfile
from apps.organizations.models import Organization, OrganizationOnboardingStatus
from apps.staff.models import StaffAssignment, StaffRole

User = get_user_model()

ACCOUNT_CUSTOMER = "customer"
ACCOUNT_ORGANIZATION = "organization"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    account_type = serializers.ChoiceField(
        choices=[ACCOUNT_CUSTOMER, ACCOUNT_ORGANIZATION],
        write_only=True,
        default=ACCOUNT_CUSTOMER,
    )
    organization_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, max_length=255
    )
    organization_slug = serializers.CharField(
        write_only=True, required=False, allow_blank=True, max_length=255
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "account_type",
            "organization_name",
            "organization_slug",
        )

    def validate(self, attrs):
        at = attrs.get("account_type", ACCOUNT_CUSTOMER)
        if at == ACCOUNT_ORGANIZATION:
            name = (attrs.get("organization_name") or "").strip()
            if not name:
                raise serializers.ValidationError(
                    {
                        "organization_name": "Organization name is required for a restaurant account.",
                    }
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        account_type = validated_data.pop("account_type", ACCOUNT_CUSTOMER)
        org_name = (validated_data.pop("organization_name", None) or "").strip()
        org_slug_input = (validated_data.pop("organization_slug", None) or "").strip()
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = False
        user.save()
        if account_type == ACCOUNT_CUSTOMER:
            CustomerProfile.objects.get_or_create(user=user)
            return user

        base_slug = org_slug_input or slugify(org_name)
        if not base_slug:
            base_slug = slugify(user.email.split("@")[0]) or "organization"
        slug = base_slug
        suffix = 0
        while Organization.objects.filter(slug=slug).exists():
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        org = Organization.objects.create(
            name=org_name,
            slug=slug,
            onboarding_status=OrganizationOnboardingStatus.PENDING_DOCUMENTS,
        )
        StaffAssignment.objects.create(
            user=user,
            organization=org,
            location=None,
            role=StaffRole.ORG_ADMIN,
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    organization_memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "is_platform_admin",
            "organization_memberships",
        )
        read_only_fields = fields

    def get_organization_memberships(self, obj):
        rows = StaffAssignment.objects.filter(user=obj).select_related("organization")
        return [
            {
                "organization_id": str(r.organization_id),
                "organization_name": r.organization.name,
                "onboarding_status": r.organization.onboarding_status,
                "role": r.role,
                "location_id": str(r.location_id) if r.location_id else None,
            }
            for r in rows
        ]
