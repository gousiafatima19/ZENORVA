from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'latitude', 'longitude')
    list_filter = ('role',)
    fieldsets = UserAdmin.fieldsets + (
        ('ZENVORA', {'fields': ('role', 'latitude', 'longitude', 'phone', 'daily_budget')}),
    )