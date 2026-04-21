from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations.models import Location
from apps.orders.models import Order
from apps.organizations.models import OrganizationOnboardingStatus
from apps.payments.models import Payment, PaymentAllocation, PaymentStatus
from apps.payments.serializers import PaymentCreateSerializer, PaymentSerializer
from apps.sessions_app.models import DiningSession
from apps.staff.models import StaffAssignment, StaffRole
from apps.staff.utils import user_can_access_location, user_location_ids


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    filterset_fields = ("location", "status", "organization")

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related("organization", "location").prefetch_related(
            "allocations"
        )
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE)
        lids = user_location_ids(user) or []
        org_scope_ids = list(
            StaffAssignment.objects.filter(
                user=user,
                location__isnull=True,
                role__in=[StaffRole.ORG_ADMIN, StaffRole.MANAGER],
            ).values_list("organization_id", flat=True)
        )
        q = Q()
        if lids:
            q |= Q(location_id__in=lids)
        if org_scope_ids:
            q |= Q(organization_id__in=org_scope_ids)
        if not q:
            return Payment.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]


class PaymentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        ser = PaymentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        loc = Location.objects.select_related("organization").get(
            pk=ser.validated_data["location"]
        )
        org = loc.organization
        if org.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(
                {"detail": "This venue is not accepting payments yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user_can_access_location(request.user, loc.id) and not getattr(
            request.user, "is_platform_admin", False
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)
        key = ser.validated_data.get("idempotency_key") or None
        if key:
            existing = Payment.objects.filter(idempotency_key=key).first()
            if existing:
                return Response(PaymentSerializer(existing).data, status=status.HTTP_200_OK)
        session_id = ser.validated_data.get("session")
        dining_session = None
        if session_id:
            dining_session = DiningSession.objects.filter(pk=session_id).first()

        payment = Payment.objects.create(
            organization=org,
            location=loc,
            amount=ser.validated_data["amount"],
            currency=ser.validated_data.get("currency", "TRY"),
            method=ser.validated_data.get("method", "cash"),
            session=dining_session,
            received_by=request.user,
            notes=ser.validated_data.get("notes", ""),
            status=PaymentStatus.COMPLETED,
            gateway="stub",
            gateway_payment_id="stub",
            idempotency_key=key,
            metadata={"note": "Replace with real gateway capture."},
        )
        for row in ser.validated_data["allocations"]:
            order = Order.objects.get(pk=row["order_id"])
            if str(order.location_id) != str(loc.id):
                return Response(
                    {"detail": "Order location mismatch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            PaymentAllocation.objects.create(
                payment=payment,
                order=order,
                amount=Decimal(str(row["amount"])),
            )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
