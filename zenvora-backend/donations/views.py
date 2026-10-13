from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Donation
from .serializers import (
    DonationSerializer,
    DonationCreateSerializer,
    DonationStatusSerializer,
    ShelterResponseSerializer,
)
from .services import match_shelters_for_donation
from notifications.email import (
    send_donation_status_email,
    send_shelter_response_email,
)


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

        from notifications.services import create_notification
        create_notification(
            user=donation.donor,
            notif_type='status',
            message=f"Donation #{donation.id} status changed to {new_status}",
            event_key=f"donation_{donation.id}_{new_status}",
        )

        send_donation_status_email(donation, new_status)

        return Response(DonationSerializer(donation).data)

    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
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

    @action(detail=True, methods=['post'], url_path='assign',
            permission_classes=[IsAuthenticated])
    def assign_to_shelter(self, request, pk=None):
        donation = self.get_object()
        shelter_id = request.data.get('shelter_id')
        if not shelter_id:
            return Response(
                {'error': 'Invalid input', 'detail': 'shelter_id is required'},
                status=400,
            )

        from shelters.models import Shelter
        try:
            shelter = Shelter.objects.get(id=shelter_id)
        except Shelter.DoesNotExist:
            return Response(
                {'error': 'Not found', 'detail': f'Shelter {shelter_id} does not exist'},
                status=404,
            )

        donation.shelter = shelter
        donation.shelter_response = 'pending'
        donation.status = 'reserved'
        donation.save()

        from notifications.services import create_notification
        create_notification(
            user=donation.donor,
            notif_type='donation',
            message=f"Donation #{donation.id} assigned to {shelter.name}",
            event_key=f"donation_{donation.id}_assigned_{shelter.id}",
        )

        return Response(DonationSerializer(donation).data)

    @action(detail=True, methods=['post'], url_path='respond',
            permission_classes=[IsAuthenticated])
    def shelter_respond(self, request, pk=None):
        donation = self.get_object()
        serializer = ShelterResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=400,
            )

        donation.shelter_response = serializer.validated_data['response']
        donation.shelter_response_note = serializer.validated_data.get('note', '')
        donation.shelter_responded_at = timezone.now()
        donation.save()

        from notifications.services import create_notification
        create_notification(
            user=donation.donor,
            notif_type='donation',
            message=(
                f"Shelter responded '{donation.shelter_response}' "
                f"to donation #{donation.id}"
            ),
            event_key=f"donation_{donation.id}_response_{donation.shelter_response}",
        )

        send_shelter_response_email(donation)

        return Response(DonationSerializer(donation).data)