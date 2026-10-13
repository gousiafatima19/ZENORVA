from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from .models import Recipe
from .serializers import RecipeSerializer, RecipeRecommendSerializer
from .services import recommend_recipes


class RecipeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recipe.objects.all().prefetch_related('ingredients')
    serializer_class = RecipeSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def recommend(self, request):
        """
        GET /api/recipes/recommend/?max_cost=200&max_time=30
        Requires Authorization header for user-specific pantry.
        """
        max_cost = request.query_params.get('max_cost')
        max_time = request.query_params.get('max_time')

        try:
            max_cost = float(max_cost) if max_cost else None
            max_time = int(max_time) if max_time else None
        except ValueError:
            return Response(
                {'error': 'Invalid input',
                 'detail': 'max_cost must be a number, max_time must be an integer'},
                status=400,
            )

        if not request.user.is_authenticated:
            return Response(
                {'error': 'Unauthorized',
                 'detail': 'Login required to recommend based on your pantry'},
                status=401,
            )

        ranked = recommend_recipes(request.user, max_cost=max_cost, max_time=max_time)

        payload = []
        for r in ranked:
            recipe = r['recipe']
            payload.append({
                'id': recipe.id,
                'name': recipe.name,
                'have': r['have'],
                'missing': r['missing'],
                'cost': r['cost'],
                'prep_time': r['prep_time'],
                'allergen_warnings': r['allergen_warnings'],
                'match_ratio': round(r['match_ratio'], 2),
                'is_demo': recipe.is_demo,
            })

        return Response(payload)