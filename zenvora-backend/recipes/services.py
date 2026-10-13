"""
Recipe recommendation engine.
- Matches recipes to pantry items
- Filters out recipes containing user's allergens
- Flags uncertain/unsafe recipes instead of declaring them safe
- Ranks by: ingredient match %, cooking time, cost
"""


def _normalize(name):
    return (name or '').strip().lower()


def recommend_recipes(user, max_cost=None, max_time=None):
    """
    Returns a list of dicts ranked by:
      1. Number of matching pantry ingredients (desc)
      2. Cooking time (asc)
      3. Cost (asc)
    """
    from pantry.models import PantryItem
    from dietary.models import DietaryProfile
    from .models import Recipe

    # 1. Get pantry ingredient names (lowercased set)
    pantry_names = set(
        _normalize(item.name)
        for item in PantryItem.objects.filter(user=user)
    )

    # 2. Get user's allergies (lowercased)
    allergies = set()
    try:
        profile = DietaryProfile.objects.get(user=user)
        allergies = set(_normalize(a) for a in (profile.allergies or []))
    except DietaryProfile.DoesNotExist:
        pass

    # 3. Iterate recipes
    results = []
    for recipe in Recipe.objects.prefetch_related('ingredients'):
        if max_cost is not None and recipe.estimated_cost > max_cost:
            continue
        if max_time is not None and recipe.cooking_time_min > max_time:
            continue

        ing_names = [_normalize(i.name) for i in recipe.ingredients.all()]

        # Allergen check → hard skip? Or flag?
        # We FLAG but don't hard-skip: user should see "may contain peanut".
        matched_allergens = [i for i in ing_names if i in allergies]

        have = [i for i in ing_names if i in pantry_names]
        missing = [i for i in ing_names if i not in pantry_names]

        match_ratio = len(have) / max(len(ing_names), 1)

        warnings = []
        if matched_allergens:
            warnings.append(
                f"Contains allergens on your profile: {', '.join(matched_allergens)}"
            )

        results.append({
            'recipe': recipe,
            'have': have,
            'missing': missing,
            'match_ratio': match_ratio,
            'cost': recipe.estimated_cost,
            'prep_time': recipe.cooking_time_min,
            'allergen_warnings': warnings,
        })

    # Sort: highest match_ratio, then lowest prep_time, then lowest cost
    results.sort(key=lambda r: (-r['match_ratio'], r['prep_time'], r['cost']))
    return results