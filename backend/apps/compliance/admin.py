from django.contrib import admin

from apps.compliance.models import ComplianceSubmission, DocumentType, OrganizationDocument


@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "required_for_activation", "max_files", "sort_order", "is_active")
    list_filter = ("is_active", "required_for_activation")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(OrganizationDocument)
class OrganizationDocumentAdmin(admin.ModelAdmin):
    list_display = ("organization", "document_type", "uploaded_by", "created_at")
    list_filter = ("document_type",)


@admin.register(ComplianceSubmission)
class ComplianceSubmissionAdmin(admin.ModelAdmin):
    list_display = ("organization", "status", "submitted_at", "reviewed_at")
    list_filter = ("status",)
