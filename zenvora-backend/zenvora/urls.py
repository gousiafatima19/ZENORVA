from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from django.conf import settings

urlpatterns = [
    # --- Admin & Auth ---
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),

    # --- APIs ---
    path('api/auth/', include('accounts.urls')),
    path('api/pantry/', include('pantry.urls')),
    path('api/recipes/', include('recipes.urls')),
    path('api/shelters/', include('shelters.urls')),
    path('api/shops/', include('shops.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/impact/', include('impact.urls')),
    path('api/assistant/', include('assistant.urls')),

    # --- Serve Person 1's assets/ folder ---
    # Kept the original block exactly as it was. In production on Render with
    # DEBUG=False, Django's static serve view is a no-op. WhiteNoise middleware
    # (see settings.py) will serve /assets/* automatically because STATIC_URL
    # is set to '/assets/'. This URL pattern still works locally when DEBUG=True.
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': str(settings.FRONTEND_DIR / 'assets')
    }),

    # --- Frontend HTML pages ---
    path('', TemplateView.as_view(template_name='login.html'), name='home'),
    path('login.html', TemplateView.as_view(template_name='login.html')),
    path('register.html', TemplateView.as_view(template_name='register.html')),
    path('index.html', TemplateView.as_view(template_name='index.html')),
    path('dashboard.html', TemplateView.as_view(template_name='dashboard.html')),
    path('pantry.html', TemplateView.as_view(template_name='pantry.html')),
    path('recipes.html', TemplateView.as_view(template_name='recipes.html')),
    path('recipe-detail.html', TemplateView.as_view(template_name='recipe-detail.html')),
    path('smart-cook.html', TemplateView.as_view(template_name='smart-cook.html')),
    path('scanner.html', TemplateView.as_view(template_name='scanner.html')),
    path('shops.html', TemplateView.as_view(template_name='shops.html')),
    path('shelter-connect.html', TemplateView.as_view(template_name='shelter-connect.html')),
    path('food-map.html', TemplateView.as_view(template_name='food-map.html')),
    path('donations.html', TemplateView.as_view(template_name='donations.html')),
    path('notifications.html', TemplateView.as_view(template_name='notifications.html')),
    path('impact.html', TemplateView.as_view(template_name='impact.html')),
    path('assistant.html', TemplateView.as_view(template_name='assistant.html')),
    path('profile.html', TemplateView.as_view(template_name='profile.html')),
    path('dietary-profile.html', TemplateView.as_view(template_name='dietary-profile.html')),
    path('settings.html', TemplateView.as_view(template_name='settings.html')),
]