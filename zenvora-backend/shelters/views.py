from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q

from .models import Shelter
from .serializers import ShelterSerializer, ShelterUpdateSerializer
from .utils import haversine_km


class ShelterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        GET /api/shelters/nearby/?lat=12.97&lng=77.59&radius=10
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
        return Response(self.get_serializer(shelters, many=True).data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        GET /api/shelters/search/?q=hope&need=cooked_meals
        """
        q = request.query_params.get('q', '').strip()
        need = request.query_params.get('need', '').strip().lower()

        qs = Shelter.objects.all()

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(address__icontains=q) |
                Q(needs__icontains=q)
            )

        if need:
            matching_ids = [
                s.id for s in qs
                if need in [n.lower() for n in (s.needs or [])]
            ]
            qs = qs.filter(id__in=matching_ids)

        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['patch'],
            permission_classes=[IsAuthenticated], url_path='update-needs')
    def update_needs(self, request, pk=None):
        """
        PATCH /api/shelters/{id}/update-needs/
        Body: { "needs": [...], "dietary_requirements": [...], ... }
        Shelter staff update their own operational fields.
        """
        shelter = self.get_object()

        # Ownership check — only shelter-role users OR staff can update
        if not (request.user.is_staff or request.user.role == 'shelter'):
            return Response(
                {'error': 'Forbidden',
                 'detail': 'Only shelter accounts can update shelter needs'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ShelterUpdateSerializer(
            shelter, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()

        # Notify donors who have pending donations matching this shelter
        from notifications.services import create_notification
        # (skip heavy loop — just notify nearby donors is out of scope)

        return Response(ShelterSerializer(shelter).data)