from rest_framework import serializers

from apps.menus.models import Category, Menu, MenuItem, MenuItemModifier, MenuLocation


class MenuItemModifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemModifier
        fields = ("id", "menu_item", "name", "price_delta", "sort_order")
        read_only_fields = ("id",)


class MenuItemSerializer(serializers.ModelSerializer):
    modifiers = MenuItemModifierSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "category",
            "name",
            "description",
            "price",
            "image",
            "is_available",
            "sort_order",
            "modifiers",
        )
        read_only_fields = ("id",)


class CategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ("id", "menu", "name", "sort_order", "items")
        read_only_fields = ("id",)


class MenuDetailSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Menu
        fields = ("id", "name", "organization", "categories")


class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = ("id", "organization", "name", "is_archived", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class MenuLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuLocation
        fields = ("id", "menu", "location", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
