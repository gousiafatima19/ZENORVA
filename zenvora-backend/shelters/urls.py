from rest_framework.routers import DefaultRouter
from .views import ShelterViewSet

router = DefaultRouter()
router.register('', ShelterViewSet, basename='shelters')

urlpatterns = router.urls