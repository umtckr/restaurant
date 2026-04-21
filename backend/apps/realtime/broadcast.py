from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_location_event(location_id: str, event_type: str, payload: dict) -> None:
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"location_{location_id}",
        {
            "type": "restaurant.event",
            "event_type": event_type,
            "payload": payload,
        },
    )
