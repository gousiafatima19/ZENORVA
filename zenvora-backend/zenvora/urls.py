from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),      # DRF login link
    path('api/auth/', include('accounts.urls')),
    path('api/pantry/', include('pantry.urls')),
    path('api/recipes/', include('recipes.urls')),
    path('api/shelters/', include('shelters.urls')),
    path('api/shops/', include('shops.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/impact/', include('impact.urls')),
    path('api/assistant/', include('assistant.urls')),      # ← ADDED
]