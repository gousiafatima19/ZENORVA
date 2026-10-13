from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PantryItemViewSet
from .scanner_views import (
    BarcodeLookupView,
    ManualIngredientView,
    ImageRecognitionView,
)

router = DefaultRouter()
router.register('', PantryItemViewSet, basename='pantry')

urlpatterns = router.urls + [
    path('scan/barcode/', BarcodeLookupView.as_view(), name='scan-barcode'),
    path('scan/ingredients/', ManualIngredientView.as_view(), name='scan-ingredients'),
    path('scan/image/', ImageRecognitionView.as_view(), name='scan-image'),
]