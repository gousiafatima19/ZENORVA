from django.contrib import admin
from .models import Recipe, RecipeIngredient


class IngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('name', 'cooking_time_min', 'estimated_cost', 'servings', 'is_demo')
    inlines = [IngredientInline]