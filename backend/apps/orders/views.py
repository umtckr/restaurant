import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.exceptions import APIException
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import (
    BillSplit,
    BillSplitPortion,
    CustomerRequest,
    Discount,
    Order,
    OrderActivityLog,
    OrderChannel,
    OrderStatus,
)
from apps.orders.serializers import (
    BillSplitSerializer,
    CustomerRequestSerializer,
    DiscountSerializer,
    OrderActivityLogSerializer,
    OrderSerializer,
)
from apps.orders.services import add_order_lines_from_payload, log_order_activity, recalculate_order_totals
from apps.organizations.models import OrganizationOnboardingStatus
from apps.sessions_app.models import DiningSession, DiningSessionStatus
from apps.staff.models import StaffAssignment, StaffRole
from apps.staff.utils import user_has_role_for_location, user_has_role_for_org, user_location_ids, user_organization_ids
from apps.subscriptions.services import PlanLimitError, check_feature, check_monthly_orders

ORDER_STATUS_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER, StaffRole.WAITER, StaffRole.HOST]
KITCHEN_ACTION_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER, StaffRole.KITCHEN]


class OrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrderSerializer
    filterset_fields = ("location", "status", "channel", "dining_session")

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.select_related(
            "organization", "location", "dining_session__table", "customer"
        ).prefetch_related("lines")
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
            return Order.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def partial_update(self, request, *args, **kwargs):
        from rest_framework.exceptions import PermissionDenied

        order = self.get_object()
        st = request.data.get("status")
        if st:
            kitchen_statuses = {OrderStatus.IN_KITCHEN, OrderStatus.READY}
            if st in kitchen_statuses:
                allowed = KITCHEN_ACTION_ROLES
            else:
                allowed = ORDER_STATUS_ROLES
            if not user_has_role_for_location(request.user, order.location_id, allowed):
                raise PermissionDenied("You do not have permission to change this order status.")
            old_status = order.status
            order.status = st
            order.save(update_fields=["status", "updated_at"])
            log_order_activity(order, old_status, st, user=request.user)
        tip = request.data.get("tip_amount")
        if tip is not None:
            order.tip_amount = Decimal(str(tip))
            order.save(update_fields=["tip_amount", "updated_at"])
            recalculate_order_totals(order)

        discount_code = request.data.get("discount_code")
        if discount_code is not None:
            if discount_code == "":
                order.discount = None
                order.discount_amount = Decimal("0")
                order.save(update_fields=["discount", "discount_amount", "updated_at"])
                recalculate_order_totals(order)
            else:
                discount = Discount.objects.filter(
                    code=discount_code, organization=order.organization,
                ).first()
                if not discount:
                    return Response(
                        {"detail": "Discount code not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                err = _validate_discount(discount, order.location_id, order.subtotal)
                if err:
                    return Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)
                order.discount = discount
                order.discount_amount = _calc_discount_amount(discount, order.subtotal)
                order.save(update_fields=["discount", "discount_amount", "updated_at"])
                discount.times_used += 1
                discount.save(update_fields=["times_used"])
                recalculate_order_totals(order)

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["get"], url_path="activity-logs")
    def activity_logs(self, request, pk=None):
        order = self.get_object()
        logs = OrderActivityLog.objects.filter(order=order).order_by("created_at")
        return Response(OrderActivityLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        order = self.get_object()
        receipt_data = {
            "order_id": str(order.id),
            "organization_name": order.organization.name,
            "location_name": order.location.name,
            "location_address": f"{order.location.address_line1}, {order.location.city}".strip(", "),
            "table_label": order.dining_session.table.label if order.dining_session and order.dining_session.table else None,
            "channel": order.channel,
            "currency": order.location.currency_code,
            "items": [
                {
                    "name": line.name_snapshot,
                    "quantity": line.quantity,
                    "unit_price": str(line.unit_price),
                    "subtotal": str(line.line_subtotal),
                    "tax": str(line.tax_snapshot),
                    "modifiers": line.modifiers_snapshot,
                }
                for line in order.lines.all()
            ],
            "subtotal": str(order.subtotal),
            "tax_amount": str(order.tax_amount),
            "discount_amount": str(order.discount_amount),
            "service_charge_amount": str(order.service_charge_amount),
            "tip_amount": str(order.tip_amount),
            "total": str(order.total),
            "discount_code": order.discount.code if order.discount else None,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
            "status": order.status,
        }
        return Response(receipt_data)


class CustomerCreateOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        session_token = request.data.get("session_token")
        channel = request.data.get("channel", OrderChannel.DINE_IN)
        lines = request.data.get("lines", [])
        if not session_token or not lines:
            return Response(
                {"detail": "session_token and lines are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tid = uuid.UUID(str(session_token))
        except ValueError:
            return Response({"detail": "Invalid session token."}, status=404)
        session = (
            DiningSession.objects.select_related("location__organization")
            .filter(token=tid, status=DiningSessionStatus.OPEN)
            .first()
        )
        if not session:
            return Response({"detail": "Session not found."}, status=404)
        if session.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(
                {"detail": "This venue is not accepting orders yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            check_monthly_orders(session.location.organization)
        except PlanLimitError as e:
            return Response(
                {"detail": str(e), "limit_key": e.limit_key, "current": e.current, "maximum": e.maximum},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        if channel != OrderChannel.DINE_IN:
            return Response(
                {"detail": "This endpoint is for dine-in session orders only."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        loc = session.location
        customer = request.user if request.user.is_authenticated else None
        order = Order.objects.create(
            organization=loc.organization,
            location=loc,
            dining_session=session,
            customer=customer,
            channel=channel,
            status=OrderStatus.DRAFT,
            guest_email=request.data.get("guest_email", ""),
            guest_phone=request.data.get("guest_phone", ""),
            idempotency_key=request.data.get("idempotency_key", "") or "",
            notes=request.data.get("notes", ""),
        )
        tip = request.data.get("tip_amount")
        if tip is not None:
            from decimal import Decimal

            order.tip_amount = Decimal(str(tip))
            order.save(update_fields=["tip_amount", "updated_at"])
        add_order_lines_from_payload(order, lines)
        order.status = OrderStatus.IN_KITCHEN
        order.save(update_fields=["status", "updated_at"])
        recalculate_order_totals(order)
        log_order_activity(order, OrderStatus.DRAFT, OrderStatus.IN_KITCHEN, user=customer, note="Order placed by guest")
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class GuestOrdersView(APIView):
    """List orders for a session by token — no auth required."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get("session_token")
        if not token_str:
            return Response(
                {"detail": "session_token query param required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tid = uuid.UUID(str(token_str))
        except ValueError:
            return Response(status=status.HTTP_404_NOT_FOUND)
        session = (
            DiningSession.objects.select_related("location__organization")
            .filter(token=tid)
            .first()
        )
        if not session:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if session.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(status=status.HTTP_404_NOT_FOUND)
        orders = (
            Order.objects.filter(dining_session=session)
            .select_related("organization", "location", "dining_session__table", "customer")
            .prefetch_related("lines")
            .order_by("-created_at")
        )
        return Response(OrderSerializer(orders, many=True).data)


class CustomerRequestCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_token = request.data.get("session_token")
        if not session_token:
            return Response({"detail": "session_token required"}, status=400)
        try:
            tid = uuid.UUID(str(session_token))
        except ValueError:
            return Response(status=404)
        session = (
            DiningSession.objects.select_related("location__organization")
            .filter(token=tid, status=DiningSessionStatus.OPEN)
            .first()
        )
        if not session:
            return Response(status=404)
        if session.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response(status=status.HTTP_403_FORBIDDEN)
        ser = CustomerRequestSerializer(
            data={
                "dining_session": str(session.id),
                "request_type": request.data.get("request_type", "waiter"),
                "note": request.data.get("note", ""),
            }
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)


class CustomerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerRequestSerializer
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("dining_session", "status", "request_type")

    def get_queryset(self):
        user = self.request.user
        qs = CustomerRequest.objects.select_related(
            "dining_session__table",
            "dining_session__location",
            "dining_session__location__organization",
        ).prefetch_related("dining_session__orders")
        if getattr(user, "is_platform_admin", False):
            return qs
        qs = qs.filter(
            dining_session__location__organization__onboarding_status=OrganizationOnboardingStatus.ACTIVE
        )
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
            q |= Q(dining_session__location_id__in=lids)
        if org_scope_ids:
            q |= Q(dining_session__location__organization_id__in=org_scope_ids)
        if not q:
            return CustomerRequest.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]


# ---------------------------------------------------------------------------
# Discount helpers
# ---------------------------------------------------------------------------

def _validate_discount(discount, location_id, order_subtotal):
    """Return an error string if the discount is invalid, or None if OK."""
    if not discount.is_active:
        return "This discount code is not active."
    now = timezone.now()
    if discount.valid_from and now < discount.valid_from:
        return "This discount code is not yet valid."
    if discount.valid_until and now > discount.valid_until:
        return "This discount code has expired."
    if discount.max_uses and discount.times_used >= discount.max_uses:
        return "This discount code has reached its maximum uses."
    if order_subtotal < discount.min_order_amount:
        return f"Minimum order amount is {discount.min_order_amount}."
    if discount.locations.exists() and not discount.locations.filter(pk=location_id).exists():
        return "This discount code is not valid for this location."
    return None


def _calc_discount_amount(discount, subtotal):
    """Compute the actual discount amount for a given subtotal."""
    if discount.discount_type == "percentage":
        amt = (subtotal * discount.value / Decimal("100")).quantize(Decimal("0.01"))
    else:
        amt = discount.value
    if discount.max_discount_amount and amt > discount.max_discount_amount:
        amt = discount.max_discount_amount
    return amt


# ---------------------------------------------------------------------------
# DiscountViewSet
# ---------------------------------------------------------------------------

DISCOUNT_MANAGE_ROLES = [StaffRole.ORG_ADMIN, StaffRole.MANAGER]


class PaymentRequired(APIException):
    status_code = 402
    default_detail = "Plan limit reached."


class DiscountViewSet(viewsets.ModelViewSet):
    serializer_class = DiscountSerializer
    filterset_fields = ("organization", "is_active")

    def get_queryset(self):
        user = self.request.user
        qs = Discount.objects.all()
        if getattr(user, "is_platform_admin", False):
            return qs
        org_ids = user_organization_ids(user) or []
        if not org_ids:
            return Discount.objects.none()
        return qs.filter(organization_id__in=org_ids)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied

        org = serializer.validated_data.get("organization")
        if not user_has_role_for_org(self.request.user, org.id, DISCOUNT_MANAGE_ROLES):
            raise PermissionDenied("You do not have permission to create discounts for this organization.")
        if not getattr(self.request.user, "is_platform_admin", False):
            try:
                check_feature(org, "has_discounts")
            except PlanLimitError as e:
                raise PaymentRequired(detail=str(e))
        serializer.save()

    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied

        org = serializer.instance.organization
        if not user_has_role_for_org(self.request.user, org.id, DISCOUNT_MANAGE_ROLES):
            raise PermissionDenied("You do not have permission to update this discount.")
        serializer.save()

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied

        if not user_has_role_for_org(self.request.user, instance.organization_id, DISCOUNT_MANAGE_ROLES):
            raise PermissionDenied("You do not have permission to delete this discount.")
        instance.delete()

    @action(detail=False, methods=["post"], url_path="validate")
    def validate(self, request):
        code = request.data.get("code", "")
        location_id = request.data.get("location")
        order_subtotal = Decimal(str(request.data.get("order_subtotal", "0")))

        if not code:
            return Response({"detail": "code is required."}, status=status.HTTP_400_BAD_REQUEST)

        org_ids = user_organization_ids(request.user)
        discount = Discount.objects.filter(code=code)
        if org_ids is not None:
            discount = discount.filter(organization_id__in=org_ids)
        discount = discount.first()

        if not discount:
            return Response({"valid": False, "detail": "Discount code not found."})

        err = _validate_discount(discount, location_id, order_subtotal)
        if err:
            return Response({"valid": False, "detail": err})

        amount = _calc_discount_amount(discount, order_subtotal)
        return Response({
            "valid": True,
            "discount_id": str(discount.id),
            "code": discount.code,
            "discount_type": discount.discount_type,
            "value": str(discount.value),
            "calculated_amount": str(amount),
        })


# ---------------------------------------------------------------------------
# BillSplitViewSet
# ---------------------------------------------------------------------------

class BillSplitViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BillSplitSerializer
    filterset_fields = ("dining_session",)

    def get_queryset(self):
        user = self.request.user
        qs = BillSplit.objects.select_related("dining_session").prefetch_related("portions")
        if getattr(user, "is_platform_admin", False):
            return qs
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
            q |= Q(dining_session__location_id__in=lids)
        if org_scope_ids:
            q |= Q(dining_session__location__organization_id__in=org_scope_ids)
        if not q:
            return BillSplit.objects.none()
        return qs.filter(q)

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    @transaction.atomic
    def perform_create(self, serializer):
        session = serializer.validated_data["dining_session"]
        if not getattr(self.request.user, "is_platform_admin", False):
            org = session.location.organization
            try:
                check_feature(org, "has_bill_splitting")
            except PlanLimitError as e:
                raise PaymentRequired(detail=str(e))
        method = serializer.validated_data["method"]
        num_guests = serializer.validated_data.get("num_guests", 1)

        total = Decimal("0")
        for order in session.orders.exclude(status="cancelled"):
            total += order.total
        total = total.quantize(Decimal("0.01"))

        bill_split = serializer.save(total_amount=total)

        if method == "equal" and num_guests > 0:
            per_guest = (total / num_guests).quantize(Decimal("0.01"))
            remainder = total - (per_guest * num_guests)
            for i in range(num_guests):
                amt = per_guest + (remainder if i == 0 else Decimal("0"))
                BillSplitPortion.objects.create(
                    bill_split=bill_split,
                    label=f"Guest {i + 1}",
                    amount=amt,
                )
        else:
            for i in range(num_guests):
                BillSplitPortion.objects.create(
                    bill_split=bill_split,
                    label=f"Guest {i + 1}",
                    amount=Decimal("0"),
                )

    @action(detail=True, methods=["post"], url_path="portions/(?P<portion_id>[^/.]+)/mark-paid")
    def mark_paid(self, request, pk=None, portion_id=None):
        bill_split = self.get_object()
        portion = bill_split.portions.filter(pk=portion_id).first()
        if not portion:
            return Response({"detail": "Portion not found."}, status=status.HTTP_404_NOT_FOUND)
        if portion.is_paid:
            return Response({"detail": "Already paid."}, status=status.HTTP_400_BAD_REQUEST)

        payment_id = request.data.get("payment_id")
        portion.is_paid = True
        portion.paid_at = timezone.now()
        if payment_id:
            from apps.payments.models import Payment
            payment = Payment.objects.filter(pk=payment_id).first()
            if payment:
                portion.payment = payment
        portion.save(update_fields=["is_paid", "paid_at", "payment", "updated_at"])
        from apps.orders.serializers import BillSplitPortionSerializer
        return Response(BillSplitPortionSerializer(portion).data)


# ---------------------------------------------------------------------------
# GuestValidateDiscountView
# ---------------------------------------------------------------------------

class GuestValidateDiscountView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_token = request.data.get("session_token")
        code = request.data.get("code", "")

        if not session_token or not code:
            return Response(
                {"detail": "session_token and code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tid = uuid.UUID(str(session_token))
        except ValueError:
            return Response({"detail": "Invalid session token."}, status=status.HTTP_404_NOT_FOUND)

        session = (
            DiningSession.objects.select_related("location__organization")
            .filter(token=tid, status=DiningSessionStatus.OPEN)
            .first()
        )
        if not session:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        org = session.location.organization
        if org.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return Response({"detail": "Venue not active."}, status=status.HTTP_403_FORBIDDEN)

        discount = Discount.objects.filter(code=code, organization=org).first()
        if not discount:
            return Response({"valid": False, "detail": "Discount code not found."})

        session_total = Decimal("0")
        for order in session.orders.exclude(status="cancelled"):
            session_total += order.total
        session_total = session_total.quantize(Decimal("0.01"))

        err = _validate_discount(discount, session.location_id, session_total)
        if err:
            return Response({"valid": False, "detail": err})

        amount = _calc_discount_amount(discount, session_total)
        return Response({
            "valid": True,
            "discount_id": str(discount.id),
            "code": discount.code,
            "discount_type": discount.discount_type,
            "value": str(discount.value),
            "calculated_amount": str(amount),
        })
