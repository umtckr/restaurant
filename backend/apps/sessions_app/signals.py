from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.realtime.broadcast import broadcast_location_event
from apps.sessions_app.models import DiningSession


@receiver(post_save, sender=DiningSession)
def session_saved(sender, instance, **kwargs):
    broadcast_location_event(
        str(instance.location_id),
        "session.updated",
        {
            "session_id": str(instance.id),
            "table_id": str(instance.table_id),
            "status": instance.status,
        },
    )
