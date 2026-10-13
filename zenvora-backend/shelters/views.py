from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Shelter
from .serializers import ShelterSerializer
from .utils import haversine_km


class ShelterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        GET /api/shelters/nearby/?lat=12.97&lng=77.59&radius=10
        Returns shelters sorted by distance, filtered by radius (km).
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

        shelters = []
        for s in Shelter.objects.all():
            d = haversine_km(lat, lng, s.latitude, s.longitude)
            if d <= radius:
                s.distance_km = round(d, 2)
                shelters.append(s)

        shelters.sort(key=lambda s: s.distance_km)
        serializer = self.get_serializer(shelters, many=True)
        return Response(serializer.data)
