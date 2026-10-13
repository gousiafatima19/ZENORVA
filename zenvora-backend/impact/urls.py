from django.urls import path
from .views import ImpactDashboardView, ImpactTrendsView

urlpatterns = [
    path('', ImpactDashboardView.as_view(), name='impact'),
    path('trends/', ImpactTrendsView.as_view(), name='impact-trends'),
]