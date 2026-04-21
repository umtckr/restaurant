from django.urls import path

from apps.realtime import consumers

websocket_urlpatterns = [
    path(
        "ws/location/<uuid:location_id>/",
        consumers.LocationConsumer.as_asgi(),
    ),
    path(
        "ws/guest/<uuid:session_token>/",
        consumers.GuestSessionConsumer.as_asgi(),
    ),
]
