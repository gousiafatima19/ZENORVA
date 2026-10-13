from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q

from .models import Shop, Offer
from .serializers import ShopSerializer, OfferSerializer
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

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        GET /api/shops/search/?q=mart&max_price=100
        """
        q = request.query_params.get('q', '').strip()
        max_price = request.query_params.get('max_price')

        qs = Shop.objects.prefetch_related('offers')

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(address__icontains=q) |
                Q(offers__item_name__icontains=q)
            ).distinct()

        if max_price:
            try:
                qs = qs.filter(offers__price__lte=float(max_price)).distinct()
            except ValueError:
                pass

        return Response(self.get_serializer(qs, many=True).data)


class OfferViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Offer.objects.all().select_related('shop')
    serializer_class = OfferSerializer
    permission_classes = [AllowAny]