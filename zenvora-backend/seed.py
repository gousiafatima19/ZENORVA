"""
ZENVORA demo seed script.
Run:  python manage.py shell < seed.py
Every demo record is flagged is_demo=True.
"""
from datetime import date, timedelta
from django.utils import timezone

from accounts.models import User
from dietary.models import DietaryProfile
from pantry.models import PantryItem
from recipes.models import Recipe, RecipeIngredient
from shops.models import Shop, Offer
from shelters.models import Shelter
from donations.models import Donation

print("Seeding ZENVORA demo data...")

# ---------- USER ----------
user, created = User.objects.get_or_create(
    username='demo',
    defaults={
        'email': 'demo@zenvora.app',
        'role': 'user',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'phone': '+91-9000000000',
        'daily_budget': 300,
    }
)
if created:
    user.set_password('demo1234')
    user.save()
print(f"  OK User: {user.username} / demo1234")

# ---------- DIETARY PROFILE ----------
DietaryProfile.objects.get_or_create(
    user=user,
    defaults={
        'allergies': ['peanut'],
        'preferences': ['vegetarian'],
        'medical_restrictions': [],
        'nutrition_prefs': ['low_sugar'],
        'budget_preference': 'medium',
    }
)
print("  OK Dietary profile")

# ---------- PANTRY ----------
pantry_data = [
    ('Rice', 2, 'kg', 'grain', 30),
    ('Milk', 1, 'L', 'dairy', 2),
    ('Tomatoes', 0.5, 'kg', 'vegetable', 4),
    ('Eggs', 6, 'pcs', 'protein', 7),
    ('Spinach', 0.25, 'kg', 'vegetable', 1),
]
for name, qty, unit, cat, days in pantry_data:
    PantryItem.objects.get_or_create(
        user=user, name=name,
        defaults={
            'quantity': qty, 'unit': unit, 'category': cat,
            'purchase_date': date.today() - timedelta(days=2),
            'expiry_date': date.today() + timedelta(days=days),
            'is_demo': True,
        }
    )
print(f"  OK Pantry: {PantryItem.objects.filter(user=user).count()} items")

# ---------- RECIPES ----------
recipes_data = [
    {
        'name': 'Vegetable Fried Rice',
        'instructions': '1. Cook rice. 2. Saute vegetables. 3. Mix and season.',
        'cooking_time_min': 20, 'estimated_cost': 80, 'servings': 2,
        'ingredients': [('Rice', 1, 'cup'), ('Tomatoes', 2, 'pcs'), ('Spinach', 100, 'g')],
    },
    {
        'name': 'Tomato Omelette',
        'instructions': '1. Beat eggs. 2. Add chopped tomatoes. 3. Cook on pan.',
        'cooking_time_min': 10, 'estimated_cost': 40, 'servings': 1,
        'ingredients': [('Eggs', 2, 'pcs'), ('Tomatoes', 1, 'pcs')],
    },
    {
        'name': 'Spinach Rice Bowl',
        'instructions': '1. Cook rice. 2. Wilt spinach. 3. Combine.',
        'cooking_time_min': 25, 'estimated_cost': 60, 'servings': 2,
        'ingredients': [('Rice', 1, 'cup'), ('Spinach', 150, 'g')],
    },
    {
        'name': 'Milk Rice Pudding',
        'instructions': '1. Boil milk. 2. Add cooked rice and simmer.',
        'cooking_time_min': 30, 'estimated_cost': 50, 'servings': 2,
        'ingredients': [('Rice', 0.5, 'cup'), ('Milk', 0.5, 'L')],
    },
    {
        'name': 'Veggie Scramble',
        'instructions': '1. Beat eggs. 2. Add veggies. 3. Scramble.',
        'cooking_time_min': 12, 'estimated_cost': 45, 'servings': 1,
        'ingredients': [('Eggs', 2, 'pcs'), ('Spinach', 50, 'g'), ('Tomatoes', 1, 'pcs')],
    },
]
for r in recipes_data:
    recipe, _ = Recipe.objects.get_or_create(
        name=r['name'],
        defaults={
            'instructions': r['instructions'],
            'cooking_time_min': r['cooking_time_min'],
            'estimated_cost': r['estimated_cost'],
            'servings': r['servings'],
            'is_demo': True,
        }
    )
    for ing_name, qty, unit in r['ingredients']:
        RecipeIngredient.objects.get_or_create(
            recipe=recipe, name=ing_name,
            defaults={'quantity': qty, 'unit': unit}
        )
print(f"  OK Recipes: {Recipe.objects.count()}")

# ---------- SHOPS ----------
shops_data = [
    ('Green Mart', 'MG Road', 12.9750, 77.6000),
    ('Fresh Bazaar', 'Indiranagar', 12.9784, 77.6408),
    ('Daily Needs', 'Koramangala', 12.9352, 77.6245),
]
for name, addr, lat, lng in shops_data:
    Shop.objects.get_or_create(
        name=name,
        defaults={'address': addr, 'latitude': lat, 'longitude': lng,
                  'is_verified': False, 'is_demo': True}
    )

shop1 = Shop.objects.get(name='Green Mart')
shop2 = Shop.objects.get(name='Fresh Bazaar')
offers_data = [
    (shop1, 'Rice 5kg', 250, 50, 10),
    (shop1, 'Milk 1L', 45, 45, 5),
    (shop2, 'Tomatoes 1kg', 30, 30, 20),
    (shop2, 'Eggs 12pcs', 70, 5.8, 15),
]
for shop, item, price, unit_price, disc in offers_data:
    Offer.objects.get_or_create(
        shop=shop, item_name=item,
        defaults={'price': price, 'unit_price': unit_price,
                  'discount_percent': disc,
                  'valid_until': timezone.now() + timedelta(days=7),
                  'is_demo': True}
    )
print(f"  OK Shops: {Shop.objects.count()}, Offers: {Offer.objects.count()}")

# ---------- SHELTERS ----------
shelters_data = [
    {
        'name': 'Hope Foundation',
        'address': 'Jayanagar',
        'latitude': 12.9250, 'longitude': 77.5938,
        'resident_count': 45,
        'age_groups': ['children', 'elderly'],
        'needs': ['cooked_meals', 'rice', 'vegetables'],
        'dietary_requirements': ['soft foods for 8 residents'],
        'allergy_flags': ['peanut'],
        'contact': '+91-9111111111',
    },
    {
        'name': 'Sunrise Shelter',
        'address': 'Whitefield',
        'latitude': 12.9698, 'longitude': 77.7500,
        'resident_count': 30,
        'age_groups': ['adults'],
        'needs': ['rice', 'eggs', 'milk'],
        'dietary_requirements': [],
        'allergy_flags': ['dairy'],
        'contact': '+91-9222222222',
    },
    {
        'name': 'Care Home',
        'address': 'HSR Layout',
        'latitude': 12.9121, 'longitude': 77.6446,
        'resident_count': 20,
        'age_groups': ['elderly'],
        'needs': ['cooked_meals', 'milk'],
        'dietary_requirements': ['low-sugar meals'],
        'allergy_flags': [],
        'contact': '+91-9333333333',
    },
]
for s in shelters_data:
    Shelter.objects.get_or_create(
        name=s['name'],
        defaults={
            'address': s['address'],
            'latitude': s['latitude'],
            'longitude': s['longitude'],
            'resident_count': s['resident_count'],
            'age_groups': s['age_groups'],
            'needs': s['needs'],
            'dietary_requirements': s['dietary_requirements'],
            'allergy_flags': s['allergy_flags'],
            'contact': s['contact'],
            'deadline': timezone.now() + timedelta(days=3),
            'is_verified': False,
            'is_demo': True,
        }
    )
print(f"  OK Shelters: {Shelter.objects.count()}")

# ---------- DEMO DONATION ----------
shelter = Shelter.objects.get(name='Hope Foundation')
Donation.objects.get_or_create(
    donor=user,
    food_type='cooked_meals',
    defaults={
        'shelter': shelter,
        'quantity': 5, 'unit': 'kg',
        'preparation_details': 'Freshly cooked, packed in sealed containers',
        'storage_conditions': 'Keep refrigerated',
        'ingredient_info': ['rice', 'vegetables'],
        'allergen_info': [],
        'collection_deadline': timezone.now() + timedelta(hours=12),
        'status': 'available',
        'is_demo': True,
    }
)
print(f"  OK Donations: {Donation.objects.count()}")

print("\nSeed complete!\n")
print("Login: demo / demo1234")
print("Admin: http://127.0.0.1:8000/admin/")