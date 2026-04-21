from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _user_from_token(token: str):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        access = AccessToken(token)
        uid = access.get("user_id")
        if uid is None:
            return AnonymousUser()
        return User.objects.get(pk=uid)
    except (User.DoesNotExist, TokenError, InvalidToken, KeyError):
        return AnonymousUser()


class JWTWebsocketMiddleware:
    """Populate scope['user'] from ?token=jwt for WebSocket connections."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "websocket":
            return await self.inner(scope, receive, send)
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        scope = dict(scope)
        if token:
            scope["user"] = await _user_from_token(token)
        else:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)
