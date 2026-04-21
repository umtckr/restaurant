import uuid

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from apps.staff.utils import user_can_access_location


class LocationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.location_id = str(self.scope["url_route"]["kwargs"]["location_id"])
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        allowed = await database_sync_to_async(user_can_access_location)(user, self.location_id)
        if not allowed and not getattr(user, "is_platform_admin", False):
            await self.close(code=4403)
            return
        self.group = f"location_{self.location_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json(
            {"type": "connection.ready", "location_id": self.location_id}
        )

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def restaurant_event(self, event):
        await self.send_json(
            {
                "type": event["event_type"],
                "payload": event["payload"],
            }
        )


class GuestSessionConsumer(AsyncJsonWebsocketConsumer):
    """Public WebSocket for guests — authenticated by session token, not JWT."""

    @database_sync_to_async
    def _resolve_session(self, token_str):
        from apps.sessions_app.models import DiningSession, DiningSessionStatus
        from apps.organizations.models import OrganizationOnboardingStatus

        try:
            tid = uuid.UUID(str(token_str))
        except (ValueError, AttributeError):
            return None
        session = (
            DiningSession.objects.select_related("location__organization")
            .filter(token=tid, status=DiningSessionStatus.OPEN)
            .first()
        )
        if not session:
            return None
        if session.location.organization.onboarding_status != OrganizationOnboardingStatus.ACTIVE:
            return None
        return session

    async def connect(self):
        token_str = self.scope["url_route"]["kwargs"].get("session_token", "")
        session = await self._resolve_session(token_str)
        if not session:
            await self.close(code=4404)
            return
        self.session_id = str(session.id)
        self.location_id = str(session.location_id)
        self.group = f"location_{self.location_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json({"type": "connection.ready", "session_id": self.session_id})

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def restaurant_event(self, event):
        payload = event.get("payload", {})
        event_type = event.get("event_type", "")
        ds_id = payload.get("dining_session_id") or payload.get("session_id")
        if event_type == "session.updated" and payload.get("session_id") == self.session_id:
            await self.send_json({"type": event_type, "payload": payload})
        elif ds_id == self.session_id:
            await self.send_json({"type": event_type, "payload": payload})
