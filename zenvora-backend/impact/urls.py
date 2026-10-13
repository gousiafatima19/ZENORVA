from django.urls import path
from .views import ImpactDashboardView

urlpatterns = [
    path('', ImpactDashboardView.as_view(), name='impact'),
]