from django.contrib import admin
from .models import Shelter


@admin.register(Shelter)
class ShelterAdmin(admin.ModelAdmin):
    list_display = ('name', 'resident_count', 'needs', 'is_verified', 'is_demo')
    list_filter = ('is_verified', 'is_demo')
    search_fields = ('name',)