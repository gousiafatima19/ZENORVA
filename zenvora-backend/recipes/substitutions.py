"""
Ingredient substitution engine.
Given a missing ingredient, suggest alternatives that are usually cheaper
or more common. This is a static map for the MVP — could be extended with
a price API later.
"""

SUBSTITUTIONS = {
    # grains
    'rice': ['brown rice', 'millet', 'broken wheat (dalia)', 'poha'],
    'basmati rice': ['sona masoori rice', 'brown rice'],
    'wheat flour': ['multigrain flour', 'oat flour'],
    'pasta': ['macaroni', 'vermicelli'],

    # proteins
    'eggs': ['paneer', 'tofu', 'chickpeas'],
    'paneer': ['tofu', 'cottage cheese'],
    'chicken': ['soy chunks', 'paneer', 'mushrooms'],
    'fish': ['canned tuna', 'soy chunks'],

    # dairy
    'milk': ['almond milk', 'soy milk', 'oat milk'],
    'curd': ['yogurt', 'plant-based curd'],
    'butter': ['ghee', 'olive oil', 'coconut oil'],
    'cheese': ['paneer', 'nutritional yeast'],

    # vegetables
    'spinach': ['methi', 'amaranth leaves', 'kale'],
    'tomatoes': ['tomato puree', 'canned tomatoes'],
    'onion': ['shallots', 'leeks'],
    'potatoes': ['sweet potatoes', 'colocasia'],

    # oils / spices
    'olive oil': ['sunflower oil', 'mustard oil'],
    'peanut oil': ['sunflower oil', 'rice bran oil'],
    'ghee': ['butter', 'coconut oil'],

    # sweeteners / misc
    'sugar': ['jaggery', 'honey'],
    'salt': ['rock salt', 'sea salt'],
    'lemon': ['lime', 'vinegar'],
    'coconut': ['desiccated coconut', 'cashew paste'],
}


def _normalize(name):
    return (name or '').strip().lower()


def get_substitutions(ingredient_name):
    """Return list of substitute names for an ingredient, or empty list."""
    return SUBSTITUTIONS.get(_normalize(ingredient_name), [])


def suggest_for_missing(missing_ingredients):
    """
    Given a list of missing ingredient names, return a list of dicts:
      [{"ingredient": "spinach", "substitutes": ["methi", "kale"]}, ...]
    Only includes ingredients that have at least one substitute.
    """
    results = []
    for name in missing_ingredients:
        subs = get_substitutions(name)
        if subs:
            results.append({
                'ingredient': name,
                'substitutes': subs,
            })
    return results