from django.contrib import admin
from .models import Donation


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('food_type', 'donor', 'shelter', 'quantity', 'status', 'is_flagged', 'is_demo')
    list_filter = ('status', 'is_flagged', 'is_demo')
    search_fields = ('food_type', 'donor__username')