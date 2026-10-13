from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Donation
from .serializers import (
    DonationSerializer, DonationCreateSerializer, DonationStatusSerializer
)
from .services import match_shelters_for_donation


class DonationViewSet(viewsets.ModelViewSet):
    serializer_class = DonationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Donation.objects.filter(donor=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = DonationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        donation = serializer.save(donor=request.user)
        return Response(
            DonationSerializer(donation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        donation = self.get_object()
        serializer = DonationStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = serializer.validated_data['status']
        allowed = ['available', 'reserved', 'collected', 'delivered']
        if new_status not in allowed:
            return Response(
                {'error': 'Invalid status',
                 'detail': f'Status must be one of {allowed}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        donation.status = new_status
        donation.save()
        return Response(DonationSerializer(donation).data)

    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """
        GET /api/donations/{id}/matches/
        Returns shelters that match the donation.
        """
        donation = self.get_object()
        matches = match_shelters_for_donation(donation)
        payload = []
        for m in matches:
            shelter = m['shelter']
            payload.append({
                'shelter_id': shelter.id,
                'shelter_name': shelter.name,
                'latitude': shelter.latitude,
                'longitude': shelter.longitude,
                'distance_km': m['distance_km'],
                'reason': m['reason'],
                'allergen_warnings': m['allergen_warnings'],
                'is_safe_guarantee': False,
                'is_demo': shelter.is_demo,
            })
        return Response(payload)