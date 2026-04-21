from rest_framework import serializers

from apps.platform_admin.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "action",
            "object_type",
            "object_id",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
