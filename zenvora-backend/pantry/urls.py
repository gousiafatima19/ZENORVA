from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PantryItemViewSet

router = DefaultRouter()
router.register('', PantryItemViewSet, basename='pantry')

urlpatterns = router.urls