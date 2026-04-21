from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import CustomerRequest, Order
from apps.realtime.broadcast import broadcast_location_event


@receiver(post_save, sender=Order)
def order_saved(sender, instance, **kwargs):
    broadcast_location_event(
        str(instance.location_id),
        "order.updated",
        {
            "order_id": str(instance.id),
            "status": instance.status,
            "dining_session_id": str(instance.dining_session_id) if instance.dining_session_id else None,
        },
    )


@receiver(post_save, sender=CustomerRequest)
def customer_request_saved(sender, instance, **kwargs):
    broadcast_location_event(
        str(instance.dining_session.location_id),
        "customer_request.updated",
        {
            "request_id": str(instance.id),
            "type": instance.request_type,
            "status": instance.status,
            "session_id": str(instance.dining_session_id),
        },
    )
