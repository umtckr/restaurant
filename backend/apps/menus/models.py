from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.locations.models import Location
from apps.organizations.models import Organization


class Menu(UUIDModel, TimeStampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="menus"
    )
    name = models.CharField(max_length=255)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = "menus_menu"
        ordering = ["name"]

    def __str__(self):
        return self.name


class MenuLocation(TimeStampedModel):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="menu_locations")
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="menu_locations"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "menus_menu_location"
        unique_together = [["menu", "location"]]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.is_active:
            qs = MenuLocation.objects.filter(location=self.location, is_active=True).exclude(
                pk=self.pk
            )
            if qs.exists():
                raise ValidationError(
                    "Only one active menu assignment per location. Deactivate the other first."
                )


class Category(UUIDModel, TimeStampedModel):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menus_category"
        ordering = ["sort_order", "name"]


class MenuItem(UUIDModel, TimeStampedModel):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="items"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    image = models.ImageField(upload_to="menu_items/", blank=True, null=True)
    is_available = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menus_menu_item"
        ordering = ["sort_order", "name"]


class MenuItemModifier(UUIDModel, TimeStampedModel):
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="modifiers"
    )
    name = models.CharField(max_length=128)
    price_delta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menus_menu_item_modifier"
        ordering = ["sort_order", "name"]
