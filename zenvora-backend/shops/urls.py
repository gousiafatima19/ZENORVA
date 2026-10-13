from rest_framework.routers import DefaultRouter
from .views import ShopViewSet, OfferViewSet

router = DefaultRouter()
router.register('offers', OfferViewSet, basename='offers')
router.register('', ShopViewSet, basename='shops')

urlpatterns = router.urls