from django.db import models


class Recipe(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    cooking_time_min = models.IntegerField(default=30)
    estimated_cost = models.FloatField(default=0)
    servings = models.IntegerField(default=2)
    is_demo = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE,
                               related_name='ingredients')
    name = models.CharField(max_length=100)
    quantity = models.FloatField()
    unit = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.name} ({self.quantity}{self.unit})"