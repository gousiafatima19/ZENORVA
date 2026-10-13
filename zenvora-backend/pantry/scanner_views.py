from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from dietary.models import DietaryProfile
from .scanner import lookup_barcode, parse_ingredients, check_allergens


def _user_allergies(user):
    try:
        profile = DietaryProfile.objects.get(user=user)
        return profile.allergies or []
    except DietaryProfile.DoesNotExist:
        return []


class BarcodeLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        barcode = (request.data.get('barcode') or '').strip()
        if not barcode:
            return Response(
                {'error': 'Invalid input', 'detail': 'barcode is required'},
                status=400,
            )

        product = lookup_barcode(barcode)
        if not product:
            return Response(
                {'error': 'Not found',
                 'detail': f'No product found for barcode {barcode}'},
                status=404,
            )

        ingredients = parse_ingredients(product['ingredients_text'])
        conflicts = check_allergens(ingredients, _user_allergies(request.user))

        return Response({
            **product,
            'ingredients_parsed': ingredients,
            'allergen_conflicts': conflicts,
            'is_safe_guarantee': False,
            'warning': (
                'Possible allergen conflict — verify before use'
                if conflicts else
                'No conflicts detected — this does NOT guarantee safety'
            ),
        })


class ManualIngredientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '')
        ingredients = parse_ingredients(text)
        conflicts = check_allergens(ingredients, _user_allergies(request.user))

        return Response({
            'ingredients_parsed': ingredients,
            'allergen_conflicts': conflicts,
            'is_safe_guarantee': False,
            'warning': (
                'Possible allergen conflict — verify before use'
                if conflicts else
                'No conflicts detected — this does NOT guarantee safety'
            ),
        })