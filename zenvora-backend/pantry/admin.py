from django.contrib import admin
from .models import PantryItem


@admin.register(PantryItem)
class PantryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'quantity', 'unit', 'expiry_date', 'is_demo')
    list_filter = ('is_demo', 'category')
    search_fields = ('name',)