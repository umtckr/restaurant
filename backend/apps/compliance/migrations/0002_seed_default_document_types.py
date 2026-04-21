from django.db import migrations


def seed_document_types(apps, schema_editor):
    DocumentType = apps.get_model("compliance", "DocumentType")
    seeds = [
        {
            "slug": "trade-register",
            "name": "Trade registry excerpt",
            "description": "Current excerpt from the commercial register or equivalent.",
            "help_text": "Upload a PDF or clear scan (max 10 MB recommended).",
            "required_for_activation": True,
            "max_files": 1,
            "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
            "sort_order": 10,
            "is_active": True,
        },
        {
            "slug": "tax-certificate",
            "name": "Tax / VAT certificate",
            "description": "Official tax identification or VAT registration document.",
            "help_text": "PDF or image; ensure tax ID is readable.",
            "required_for_activation": True,
            "max_files": 1,
            "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
            "sort_order": 20,
            "is_active": True,
        },
        {
            "slug": "id-authorised-signatory",
            "name": "ID of authorised signatory",
            "description": "Government-issued photo ID for the person signing up.",
            "help_text": "Passport or national ID; you may redress unrelated fields if required by law.",
            "required_for_activation": True,
            "max_files": 2,
            "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
            "sort_order": 30,
            "is_active": True,
        },
    ]
    for row in seeds:
        DocumentType.objects.update_or_create(slug=row["slug"], defaults=row)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0001_onboarding_and_compliance"),
    ]

    operations = [
        migrations.RunPython(seed_document_types, noop_reverse),
    ]
