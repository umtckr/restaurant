from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsPlatformAdmin
from apps.organizations.models import Organization
from apps.subscriptions.models import (
    BillingCycle,
    Plan,
    Subscription,
    SubscriptionStatus,
)
from apps.subscriptions.serializers import (
    PlanPublicSerializer,
    PlanSerializer,
    SubscriptionAdminWriteSerializer,
    SubscriptionSerializer,
)
from apps.subscriptions.services import get_subscription_summary


class PlanPublicView(APIView):
    """Public endpoint for the pricing page — no auth."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("sort_order", "monthly_price")
        return Response(PlanPublicSerializer(plans, many=True).data)


class PlanAdminViewSet(viewsets.ModelViewSet):
    """Platform admin CRUD for plans."""

    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]
    queryset = Plan.objects.all().order_by("sort_order", "monthly_price")


class SubscriptionAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """Platform admin: view all subscriptions."""

    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]
    filterset_fields = ("status", "plan", "organization")

    def get_queryset(self):
        return Subscription.objects.select_related("plan", "organization").all()

    @action(detail=False, methods=["post"], url_path="assign")
    def assign(self, request):
        """Create or update a subscription for an organization."""
        ser = SubscriptionAdminWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        org = Organization.objects.filter(pk=d["organization"]).first()
        if not org:
            return Response({"detail": "Organization not found."}, status=404)
        plan = Plan.objects.filter(pk=d["plan"]).first()
        if not plan:
            return Response({"detail": "Plan not found."}, status=404)

        sub, created = Subscription.objects.update_or_create(
            organization=org,
            defaults={
                "plan": plan,
                "status": d.get("status", SubscriptionStatus.ACTIVE),
                "billing_cycle": d.get("billing_cycle", BillingCycle.MONTHLY),
                "custom_overrides": d.get("custom_overrides", {}),
                "changed_by": request.user,
            },
        )
        if created or d.get("trial_days"):
            trial_days = d.get("trial_days", plan.trial_days)
            if trial_days and sub.status == SubscriptionStatus.TRIALING:
                sub.trial_start = timezone.now()
                sub.trial_end = timezone.now() + timedelta(days=trial_days)
                sub.save(update_fields=["trial_start", "trial_end", "updated_at"])
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="set-overrides")
    def set_overrides(self, request, pk=None):
        sub = self.get_object()
        overrides = request.data.get("custom_overrides", {})
        sub.custom_overrides = overrides
        sub.changed_by = request.user
        sub.save(update_fields=["custom_overrides", "changed_by", "updated_at"])
        return Response(SubscriptionSerializer(sub).data)


class MySubscriptionView(APIView):
    """Authenticated user: get their org's subscription summary."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.staff.models import StaffAssignment

        assignment = (
            StaffAssignment.objects.filter(user=request.user)
            .select_related("organization")
            .first()
        )
        if not assignment:
            return Response({"detail": "No organization found."}, status=404)
        summary = get_subscription_summary(assignment.organization)
        return Response(summary)
