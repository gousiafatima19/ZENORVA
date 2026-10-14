from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/pantry/', include('pantry.urls')),
    path('api/recipes/', include('recipes.urls')),
    path('api/shelters/', include('shelters.urls')),
    path('api/shops/', include('shops.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/impact/', include('impact.urls')),
    path('api/assistant/', include('assistant.urls')),

    # Frontend pages
    path('', TemplateView.as_view(template_name='login.html'), name='home'),
    path('dashboard.html', TemplateView.as_view(template_name='dashboard.html')),
    path('recipes.html', TemplateView.as_view(template_name='recipes.html')),
    path('shelters.html', TemplateView.as_view(template_name='shelters.html')),
    path('donations.html', TemplateView.as_view(template_name='donations.html')),
    path('scanner.html', TemplateView.as_view(template_name='scanner.html')),
    path('impact.html', TemplateView.as_view(template_name='impact.html')),
    path('assistant.html', TemplateView.as_view(template_name='assistant.html')),
]