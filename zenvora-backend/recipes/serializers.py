from rest_framework import serializers
from .models import Recipe, RecipeIngredient


class RecipeIngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecipeIngredient
        fields = ['name', 'quantity', 'unit']


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    steps = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = ['id', 'name', 'description', 'instructions', 'steps',
                  'cooking_time_min', 'estimated_cost', 'servings',
                  'ingredients', 'is_demo']

    def get_steps(self, obj):
        if not obj.instructions:
            return []
        # Split on numbered steps or newlines
        raw = obj.instructions.strip()
        parts = [p.strip() for p in raw.replace('\n', '.').split('.') if p.strip()]
        return parts


class RecipeRecommendSerializer(serializers.ModelSerializer):
    have = serializers.ListField()
    missing = serializers.ListField()
    cost = serializers.FloatField(source='estimated_cost')
    prep_time = serializers.IntegerField(source='cooking_time_min')
    allergen_warnings = serializers.ListField()
    is_demo = serializers.BooleanField()