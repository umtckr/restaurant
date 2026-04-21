from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.organizations.models import Organization


class TipMode(models.TextChoices):
    OFF = "off", "Off"
    SUGGESTED = "suggested", "Suggested amounts"
    CUSTOMER_ENTERS = "customer_enters", "Customer enters"


class ServiceChargeApply(models.TextChoices):
    OFF = "off", "Off"
    DINE_IN = "dine_in", "Dine-in only"
    TAKEAWAY = "takeaway", "Takeaway only"
    DELIVERY = "delivery", "Delivery only"
    ALL = "all", "All channels"


class Location(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="locations"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=128, blank=True)
    country = models.CharField(max_length=2, default="TR")
    currency_code = models.CharField(max_length=3, default="TRY")
    timezone = models.CharField(max_length=64, default="Europe/Istanbul")
    is_active = models.BooleanField(default=True)

    tip_mode = models.CharField(
        max_length=32, choices=TipMode.choices, default=TipMode.SUGGESTED
    )
    tip_presets_percent = models.JSONField(
        default=list,
        help_text='e.g. [10, 15, 20] — admin-configured suggested tip percentages',
    )
    service_charge_enabled = models.BooleanField(default=False)
    service_charge_apply = models.CharField(
        max_length=32,
        choices=ServiceChargeApply.choices,
        default=ServiceChargeApply.DINE_IN,
    )
    service_charge_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    tax_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        db_table = "locations_location"
        ordering = ["name"]
        unique_together = [["organization", "slug"]]

    def __str__(self):
        return f"{self.organization.name} — {self.name}"


class Zone(UUIDModel, TimeStampedModel):
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="zones"
    )
    name = models.CharField(max_length=128)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "locations_zone"
        ordering = ["sort_order", "name"]
        unique_together = [["location", "name"]]

    def __str__(self):
        return f"{self.location.name} / {self.name}"


class Table(UUIDModel, TimeStampedModel):
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="tables"
    )
    zone = models.ForeignKey(
        Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name="tables"
    )
    label = models.CharField(max_length=64)
    capacity = models.PositiveSmallIntegerField(default=4)
    sort_order = models.PositiveIntegerField(default=0)
    map_x = models.FloatField(null=True, blank=True)
    map_y = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "locations_table"
        ordering = ["sort_order", "label"]
        unique_together = [["location", "label"]]

    def __str__(self):
        return f"{self.location.name} / {self.label}"
