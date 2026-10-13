from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count

from donations.models import Donation


class ImpactDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /api/impact/
        Returns impact stats, distinguishing verified vs demo data.
        """
        # Only count DELIVERED donations for impact
        delivered = Donation.objects.filter(status='delivered')

        # Split demo vs real
        delivered_demo = delivered.filter(is_demo=True)
        delivered_real = delivered.filter(is_demo=False)

        def aggregate(qs):
            total_kg = qs.aggregate(total=Sum('quantity'))['total'] or 0
            return {
                'donations_count': qs.count(),
                'quantity_kg': round(total_kg, 2),
                'estimated_meals': int(total_kg * 2),          # 1 kg ≈ 2 meals
                'estimated_savings_inr': int(total_kg * 60),    # ₹60/kg avg
            }

        # Also count pending / in-progress
        pending = Donation.objects.filter(status__in=['available', 'reserved', 'collected'])

        return Response({
            'verified': {
                'delivered': aggregate(delivered_real),
            },
            'demo': {
                'delivered': aggregate(delivered_demo),
            },
            'in_progress': {
                'donations_count': pending.count(),
                'quantity_kg': round(
                    pending.aggregate(total=Sum('quantity'))['total'] or 0, 2
                ),
            },
            'shelters_supported': delivered.values('shelter').distinct().count(),
            'note': 'Demo figures are sample data and must not be presented as real outcomes.',
        })