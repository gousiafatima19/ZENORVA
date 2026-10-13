from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .models import PantryItem
from .serializers import PantryItemSerializer


class PantryItemViewSet(viewsets.ModelViewSet):
    serializer_class = PantryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PantryItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        soon = timezone.now().date() + timedelta(days=3)
        items = self.get_queryset().filter(expiry_date__lte=soon)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)