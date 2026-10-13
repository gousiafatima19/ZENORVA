"""
Shopping list generator.
Given a list of recipe IDs, compute the ingredients the user needs to buy,
minus what's already in their pantry.
"""


def _normalize(name):
    return (name or '').strip().lower()


def build_shopping_list(user, recipe_ids):
    """
    Returns:
      {
        "recipes": [{id, name}],
        "to_buy": [{name, total_quantity, unit, for_recipes: []}],
        "already_have": [{name, in_pantry_quantity, unit, needed}],
        "estimated_cost": float,
      }
    """
    from pantry.models import PantryItem
    from .models import Recipe

    recipes = Recipe.objects.filter(id__in=recipe_ids).prefetch_related('ingredients')
    if not recipes.exists():
        return {
            'recipes': [],
            'to_buy': [],
            'already_have': [],
            'estimated_cost': 0.0,
        }

    # Build pantry lookup: name → {quantity, unit}
    pantry = {}
    for item in PantryItem.objects.filter(user=user):
        key = _normalize(item.name)
        pantry[key] = {
            'quantity': item.quantity,
            'unit': item.unit,
        }

    # Aggregate ingredients needed across all recipes
    needed = {}   # key → {name, total_quantity, unit, for_recipes}
    for r in recipes:
        for ing in r.ingredients.all():
            key = _normalize(ing.name)
            if key not in needed:
                needed[key] = {
                    'name': ing.name,
                    'total_quantity': 0.0,
                    'unit': ing.unit,
                    'for_recipes': [],
                }
            needed[key]['total_quantity'] += ing.quantity
            if r.name not in needed[key]['for_recipes']:
                needed[key]['for_recipes'].append(r.name)

    to_buy = []
    already_have = []

    for key, info in needed.items():
        have = pantry.get(key)
        if have and have['quantity'] >= info['total_quantity']:
            already_have.append({
                'name': info['name'],
                'in_pantry_quantity': have['quantity'],
                'unit': have['unit'],
                'needed': info['total_quantity'],
            })
        else:
            missing_qty = info['total_quantity'] - (have['quantity'] if have else 0)
            to_buy.append({
                'name': info['name'],
                'total_quantity': round(missing_qty, 2),
                'unit': info['unit'],
                'for_recipes': info['for_recipes'],
            })

    # Rough cost estimate — recipes already have estimated_cost
    estimated_cost = sum(r.estimated_cost for r in recipes)

    return {
        'recipes': [{'id': r.id, 'name': r.name} for r in recipes],
        'to_buy': to_buy,
        'already_have': already_have,
        'estimated_cost': round(estimated_cost, 2),
    }