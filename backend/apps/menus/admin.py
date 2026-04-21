from django.contrib import admin

from apps.menus.models import Category, Menu, MenuItem, MenuItemModifier, MenuLocation


class CategoryInline(admin.TabularInline):
    model = Category
    extra = 0


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 0


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "is_archived")
    list_filter = ("organization", "is_archived")
    inlines = [CategoryInline]


@admin.register(MenuLocation)
class MenuLocationAdmin(admin.ModelAdmin):
    list_display = ("menu", "location", "is_active")


class ModifierInline(admin.TabularInline):
    model = MenuItemModifier
    extra = 0


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "is_available")
    inlines = [ModifierInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "menu", "sort_order")
