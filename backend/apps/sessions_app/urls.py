from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.sessions_app.views import DiningSessionByTokenView, DiningSessionViewSet

router = DefaultRouter()
router.register("dining-sessions", DiningSessionViewSet, basename="diningsession")

urlpatterns = [
    path(
        "dining-sessions/by-token/<uuid:token>/",
        DiningSessionByTokenView.as_view(),
        name="dining-session-by-token",
    ),
] + router.urls
