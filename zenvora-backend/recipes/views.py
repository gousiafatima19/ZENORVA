from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q

from .models import Recipe
from .serializers import RecipeSerializer
from .services import recommend_recipes
from .shopping_list import build_shopping_list
from .substitutions import suggest_for_missing


class RecipeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recipe.objects.all().prefetch_related('ingredients')
    serializer_class = RecipeSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def recommend(self, request):
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
                'substitutes': suggest_for_missing(r['missing']),
                'cost': r['cost'],
                'prep_time': r['prep_time'],
                'allergen_warnings': r['allergen_warnings'],
                'match_ratio': round(r['match_ratio'], 2),
                'is_demo': recipe.is_demo,
            })

        return Response(payload)

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        max_cost = request.query_params.get('max_cost')
        max_time = request.query_params.get('max_time')

        qs = Recipe.objects.all().prefetch_related('ingredients')

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(ingredients__name__icontains=q)
            ).distinct()

        if max_cost:
            try:
                qs = qs.filter(estimated_cost__lte=float(max_cost))
            except ValueError:
                pass

        if max_time:
            try:
                qs = qs.filter(cooking_time_min__lte=int(max_time))
            except ValueError:
                pass

        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def shopping_list(self, request):
        ids = request.data.get('recipe_ids') or []
        if not isinstance(ids, list):
            return Response(
                {'error': 'Invalid input',
                 'detail': 'recipe_ids must be a list of integers'},
                status=400,
            )

        try:
            ids = [int(i) for i in ids]
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid input',
                 'detail': 'recipe_ids must contain only integers'},
                status=400,
            )

        if not ids:
            return Response(
                {'error': 'Invalid input',
                 'detail': 'recipe_ids cannot be empty'},
                status=400,
            )

        result = build_shopping_list(request.user, ids)
        return Response(result)

    @action(detail=True, methods=['get'], url_path='substitutes')
    def substitutes_for_recipe(self, request, pk=None):
        """
        GET /api/recipes/{id}/substitutes/
        Returns substitutes for the ingredients the user is missing.
        """
        from pantry.models import PantryItem
        recipe = self.get_object()

        if not request.user.is_authenticated:
            pantry_names = set()
        else:
            pantry_names = set(
                (i.name or '').strip().lower()
                for i in PantryItem.objects.filter(user=request.user)
            )

        missing = []
        for ing in recipe.ingredients.all():
            if (ing.name or '').strip().lower() not in pantry_names:
                missing.append(ing.name)

        return Response({
            'recipe_id': recipe.id,
            'recipe_name': recipe.name,
            'missing': missing,
            'substitutes': suggest_for_missing(missing),
        })