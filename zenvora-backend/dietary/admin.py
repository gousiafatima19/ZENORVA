from django.contrib import admin
from .models import DietaryProfile


@admin.register(DietaryProfile)
class DietaryProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'allergies', 'preferences')