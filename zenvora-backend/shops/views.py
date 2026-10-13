from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Shop
from .serializers import OfferSerializer, ShopSerializer
from shelters.utils import haversine_km


class ShopViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Shop.objects.all().prefetch_related('offers')
    serializer_class = ShopSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        GET /api/shops/nearby/?lat=12.97&lng=77.59&radius=10
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', '10')

        if lat is None or lng is None:
            return Response(
                {'error': 'Invalid input',
                 'detail': 'lat and lng query params are required'},
                status=400,
            )

        try:
            lat = float(lat)
            lng = float(lng)
            radius = float(radius)
        except ValueError:
            return Response(
                {'error': 'Invalid input',
                 'detail': 'lat, lng, radius must be numbers'},
                status=400,
            )

        results = []
        for s in Shop.objects.prefetch_related('offers'):
            d = haversine_km(lat, lng, s.latitude, s.longitude)
            if d <= radius:
                s.distance_km = round(d, 2)
                results.append(s)

        results.sort(key=lambda s: s.distance_km)
        return Response(self.get_serializer(results, many=True).data)


class OfferViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import Offer as _Offer
    queryset = _Offer.objects.all().select_related('shop')
    serializer_class = OfferSerializer
    permission_classes = [AllowAny]
