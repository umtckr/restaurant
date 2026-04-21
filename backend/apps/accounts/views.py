from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        """Update the authenticated user's profile (first_name, last_name, phone)."""
        user = request.user
        fields = []
        for field in ("first_name", "last_name", "phone"):
            val = request.data.get(field)
            if val is not None:
                setattr(user, field, val.strip())
                fields.append(field)
        if fields:
            user.save(update_fields=fields)
        return Response(UserSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new_pw = request.data.get("new_password", "")
        if not current or not new_pw:
            return Response(
                {"detail": "current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_pw) < 8:
            return Response(
                {"detail": "New password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new_pw)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password changed successfully."})
