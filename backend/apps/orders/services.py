from decimal import Decimal

from django.db import transaction

from apps.locations.models import Location
from apps.orders.models import OrderActivityLog


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def recalculate_order_totals(order) -> None:
    """Recompute subtotal, tax, service charge, total from lines + location policy."""
    lines = order.lines.all()
    subtotal = sum((ln.line_subtotal for ln in lines), start=Decimal("0"))
    subtotal = _quantize_money(subtotal)

    location: Location = order.location
    tax_amount = _quantize_money(
        sum((ln.tax_snapshot for ln in lines), start=Decimal("0"))
    )

    service = Decimal("0")
    if location.service_charge_enabled and location.service_charge_percent:
        apply = location.service_charge_apply
        if apply != "off":
            ch = order.channel
            applies = (
                apply == "all"
                or (apply == "dine_in" and ch == "dine_in")
                or (apply == "takeaway" and ch == "takeaway")
                or (apply == "delivery" and ch == "delivery")
            )
            if applies:
                service = _quantize_money(subtotal * location.service_charge_percent / Decimal("100"))

    discount_amt = Decimal("0")
    if order.discount_id:
        try:
            disc = order.discount
        except Exception:
            disc = None
        if disc:
            if disc.discount_type == "percentage":
                discount_amt = _quantize_money(subtotal * disc.value / Decimal("100"))
            else:
                discount_amt = _quantize_money(disc.value)
            if disc.max_discount_amount is not None:
                discount_amt = min(discount_amt, disc.max_discount_amount)
            discount_amt = min(discount_amt, subtotal)

    tip = order.tip_amount or Decimal("0")
    total = _quantize_money(subtotal + tax_amount - discount_amt + service + tip)

    order.subtotal = subtotal
    order.discount_amount = discount_amt
    order.tax_amount = tax_amount
    order.service_charge_amount = service
    order.total = total
    order.save(
        update_fields=[
            "subtotal",
            "discount_amount",
            "tax_amount",
            "service_charge_amount",
            "total",
            "updated_at",
        ]
    )


def log_order_activity(order, old_status: str, new_status: str, user=None, note: str = "") -> None:
    """Create an activity log entry for an order status change."""
    actor_label = ""
    if user and user.is_authenticated:
        name = f"{user.first_name} {user.last_name}".strip()
        actor_label = name or user.email
    elif not user or not user.is_authenticated:
        actor_label = "Guest"

    OrderActivityLog.objects.create(
        order=order,
        old_status=old_status,
        new_status=new_status,
        changed_by=user if user and user.is_authenticated else None,
        actor_label=actor_label,
        note=note,
    )


@transaction.atomic
def add_order_lines_from_payload(order, lines_payload: list) -> None:
    from apps.menus.models import MenuItem, MenuItemModifier, MenuLocation
    from apps.orders.models import OrderLine

    for row in lines_payload:
        item_id = row.get("menu_item") or row.get("menu_item_id")
        qty = int(row.get("quantity", 1))
        item = (
            MenuItem.objects.select_related("category__menu")
            .filter(pk=item_id)
            .first()
        )
        if not item:
            continue
        menu = item.category.menu
        if menu.organization_id != order.organization_id:
            continue
        if not MenuLocation.objects.filter(
            menu=menu, location=order.location, is_active=True
        ).exists():
            continue
        unit = item.price

        modifier_ids = [m.get("id") for m in row.get("modifiers", []) if m.get("id")]
        db_modifiers = MenuItemModifier.objects.filter(
            pk__in=modifier_ids, menu_item=item
        )
        mod_total = Decimal("0")
        modifiers_snapshot = []
        for mod in db_modifiers:
            mod_total += mod.price_delta
            modifiers_snapshot.append({
                "id": str(mod.pk),
                "name": mod.name,
                "price_delta": str(mod.price_delta),
            })

        line_sub = _quantize_money((unit + mod_total) * qty)
        tax_rate = order.location.tax_rate_percent or Decimal("0")
        line_tax = _quantize_money(line_sub * tax_rate / Decimal("100"))
        OrderLine.objects.create(
            order=order,
            menu_item=item,
            name_snapshot=item.name,
            unit_price=unit + mod_total,
            quantity=qty,
            modifiers_snapshot=modifiers_snapshot,
            line_subtotal=line_sub,
            tax_snapshot=line_tax,
        )
    recalculate_order_totals(order)
