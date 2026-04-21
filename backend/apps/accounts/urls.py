from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.views import ChangePasswordView, MeView, RegisterView

urlpatterns = [
    path("token/refresh", TokenRefreshView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token", TokenObtainPairView.as_view()),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("register", RegisterView.as_view()),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("me", MeView.as_view()),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/change-password", ChangePasswordView.as_view()),
    path("me/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]
