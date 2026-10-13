"""
Food scanner utilities.
- Barcode lookup via Open Food Facts (free API, no key needed)
- Ingredient parsing + allergy check
"""
import json
import urllib.request
import urllib.error


OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/{barcode}.json'


def lookup_barcode(barcode):
    """Fetch product info from Open Food Facts."""
    url = OFF_URL.format(barcode=barcode)
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'ZENVORA/1.0 (hackathon)'},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode('utf-8'))
    except Exception:
        return None

    if data.get('status') != 1:
        return None

    p = data.get('product', {})
    return {
        'barcode': barcode,
        'name': p.get('product_name') or '',
        'brand': p.get('brands') or '',
        'ingredients_text': p.get('ingredients_text') or '',
        'allergens': (p.get('allergens_tags') or []),
        'image_url': p.get('image_url') or '',
        'source': 'openfoodfacts',
    }


def parse_ingredients(text):
    if not text:
        return []
    parts = [p.strip().lower() for p in text.replace(';', ',').split(',')]
    return [p for p in parts if p]


def check_allergens(ingredients, user_allergies):
    ing_set = set(i.lower() for i in ingredients)
    allergy_set = set(a.lower() for a in (user_allergies or []))
    return sorted(ing_set & allergy_set)