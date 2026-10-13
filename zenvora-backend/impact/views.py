from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from donations.models import Donation


class ImpactDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /api/impact/
        Returns impact stats, distinguishing verified vs demo data.
        """
        delivered = Donation.objects.filter(status='delivered')

        delivered_demo = delivered.filter(is_demo=True)
        delivered_real = delivered.filter(is_demo=False)

        def aggregate(qs):
            total_kg = qs.aggregate(total=Sum('quantity'))['total'] or 0
            return {
                'donations_count': qs.count(),
                'quantity_kg': round(total_kg, 2),
                'estimated_meals': int(total_kg * 2),
                'estimated_savings_inr': int(total_kg * 60),
            }

        pending = Donation.objects.filter(
            status__in=['available', 'reserved', 'collected']
        )

        return Response({
            'verified': {'delivered': aggregate(delivered_real)},
            'demo': {'delivered': aggregate(delivered_demo)},
            'in_progress': {
                'donations_count': pending.count(),
                'quantity_kg': round(
                    pending.aggregate(total=Sum('quantity'))['total'] or 0, 2
                ),
            },
            'shelters_supported': delivered.values('shelter').distinct().count(),
            'note': 'Demo figures are sample data and must not be presented as real outcomes.',
        })


class ImpactTrendsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /api/impact/trends/?days=7
        Returns daily delivered donation counts and quantities for the last N days.
        """
        try:
            days = int(request.query_params.get('days', 7))
        except ValueError:
            return Response(
                {'error': 'Invalid input', 'detail': 'days must be an integer'},
                status=400,
            )

        days = max(1, min(days, 90))   # clamp 1-90

        since = timezone.now() - timedelta(days=days)

        qs = (
            Donation.objects
            .filter(status='delivered', updated_at__gte=since)
            .annotate(day=TruncDate('updated_at'))
            .values('day')
            .annotate(
                donations_count=Count('id'),
                quantity_kg=Sum('quantity'),
            )
            .order_by('day')
        )

        # Build a lookup of existing days
        existing = {
            row['day'].isoformat(): {
                'donations_count': row['donations_count'],
                'quantity_kg': round(row['quantity_kg'] or 0, 2),
            }
            for row in qs
        }

        # Fill every day in the range (so frontend can draw a continuous chart)
        today = timezone.now().date()
        series = []
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            key = day.isoformat()
            entry = existing.get(key, {'donations_count': 0, 'quantity_kg': 0.0})
            series.append({
                'date': key,
                **entry,
            })

        return Response({
            'days': days,
            'series': series,
        })