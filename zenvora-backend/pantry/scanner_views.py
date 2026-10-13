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
class ImageRecognitionView(APIView):
    """
    POST /api/pantry/scan/image/
    Multipart: file=<image>
    Returns: { ingredients, confidence, notes, allergen_conflicts, is_safe_guarantee }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image = request.FILES.get('file')
        if not image:
            return Response(
                {'error': 'Invalid input', 'detail': 'file is required (multipart/form-data)'},
                status=400,
            )

        # Size limit: 5 MB
        if image.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'File too large', 'detail': 'max 5 MB'},
                status=400,
            )

        from .vision import identify_ingredients

        result = identify_ingredients(image.read(), image.content_type or 'image/jpeg')
        if not result:
            return Response(
                {'error': 'Recognition unavailable',
                 'detail': 'Image recognition is not configured or the service failed. '
                           'Try manual entry via /api/pantry/scan/ingredients/.'},
                status=503,
            )

        conflicts = check_allergens(result['ingredients'], _user_allergies(request.user))

        return Response({
            'ingredients_parsed': result['ingredients'],
            'confidence': result['confidence'],
            'notes': result['notes'],
            'allergen_conflicts': conflicts,
            'is_safe_guarantee': False,
            'warning': (
                'Possible allergen conflict — verify before use'
                if conflicts else
                'No conflicts detected — this does NOT guarantee safety'
            ),
        })