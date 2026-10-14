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
from notifications.models import Notification

print("Seeding ZENVORA demo data...")

# =========================================================
# USERS (2)
# =========================================================
main_user, created = User.objects.get_or_create(
    username='demo',
    defaults={
        'email': 'fatimasiya31@gmail.com',
        'role': 'user',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'phone': '+91-9000000000',
        'daily_budget': 300,
        'weekly_budget': 2100,
    }
)
if created:
    main_user.set_password('demo1234')
    main_user.save()
print("  OK User: demo / demo1234")

other_user, created = User.objects.get_or_create(
    username='aisha',
    defaults={
        'email': 'aisha@zenvora.app',
        'role': 'user',
        'latitude': 12.9780,
        'longitude': 77.6400,
        'phone': '+91-9111111111',
        'daily_budget': 250,
    }
)
if created:
    other_user.set_password('aisha1234')
    other_user.save()
print("  OK User: aisha / aisha1234")

# =========================================================
# DIETARY PROFILES
# =========================================================
DietaryProfile.objects.get_or_create(
    user=main_user,
    defaults={
        'allergies': ['peanut'],
        'preferences': ['vegetarian'],
        'medical_restrictions': [],
        'nutrition_prefs': ['low_sugar'],
        'budget_preference': 'medium',
    }
)
DietaryProfile.objects.get_or_create(
    user=other_user,
    defaults={
        'allergies': ['dairy'],
        'preferences': ['vegetarian', 'low_oil'],
        'medical_restrictions': [],
        'nutrition_prefs': ['high_protein'],
        'budget_preference': 'low',
    }
)
print("  OK Dietary profiles (2)")

# =========================================================
# PANTRY
# =========================================================
pantry_items = [
    ('Rice', 3, 'kg', 'grain', 60),
    ('Milk', 1, 'L', 'dairy', 2),
    ('Tomatoes', 0.5, 'kg', 'vegetable', 4),
    ('Eggs', 8, 'pcs', 'protein', 10),
    ('Spinach', 0.25, 'kg', 'vegetable', 1),
    ('Onions', 1, 'kg', 'vegetable', 20),
    ('Potatoes', 1.5, 'kg', 'vegetable', 30),
    ('Bread', 1, 'pcs', 'bakery', 3),
    ('Yogurt', 0.5, 'kg', 'dairy', 6),
    ('Lentils (Dal)', 1, 'kg', 'protein', 90),
    ('Cooking Oil', 1, 'L', 'oil', 120),
    ('Salt', 0.5, 'kg', 'spice', 365),
]
for name, qty, unit, cat, days in pantry_items:
    PantryItem.objects.get_or_create(
        user=main_user, name=name,
        defaults={
            'quantity': qty, 'unit': unit, 'category': cat,
            'purchase_date': date.today() - timedelta(days=3),
            'expiry_date': date.today() + timedelta(days=days),
            'is_demo': True,
        }
    )
print(f"  OK Pantry (main): {PantryItem.objects.filter(user=main_user).count()} items")

for name, qty, unit, cat, days in [
    ('Rice', 2, 'kg', 'grain', 45),
    ('Wheat Flour', 2, 'kg', 'grain', 90),
    ('Chickpeas', 1, 'kg', 'protein', 120),
    ('Tomatoes', 0.75, 'kg', 'vegetable', 5),
]:
    PantryItem.objects.get_or_create(
        user=other_user, name=name,
        defaults={
            'quantity': qty, 'unit': unit, 'category': cat,
            'purchase_date': date.today() - timedelta(days=2),
            'expiry_date': date.today() + timedelta(days=days),
            'is_demo': True,
        }
    )
print(f"  OK Pantry (aisha): {PantryItem.objects.filter(user=other_user).count()} items")

# =========================================================
# RECIPES (25)
# =========================================================
recipes_data = [
    # --- Rice dishes ---
    {'name': 'Vegetable Fried Rice',
     'description': 'Quick stir-fried rice with fresh vegetables',
     'instructions': '1. Cook rice and cool. 2. Saute onions and tomatoes. 3. Add spinach and rice. 4. Season.',
     'cooking_time_min': 20, 'estimated_cost': 80, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Tomatoes', 2, 'pcs'), ('Spinach', 100, 'g'), ('Onions', 1, 'pcs')]},
    {'name': 'Tomato Rice',
     'description': 'Tangy South Indian tomato rice',
     'instructions': '1. Cook rice. 2. Saute tomatoes with spices. 3. Mix. 4. Garnish with coriander.',
     'cooking_time_min': 25, 'estimated_cost': 55, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Tomatoes', 3, 'pcs'), ('Onions', 1, 'pcs')]},
    {'name': 'Yogurt Rice',
     'description': 'Cooling curd rice - perfect for summer',
     'instructions': '1. Cook rice. 2. Cool and mix with yogurt. 3. Add salt and oil. 4. Serve chilled.',
     'cooking_time_min': 15, 'estimated_cost': 40, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Yogurt', 1, 'cup'), ('Cooking Oil', 1, 'tsp')]},
    {'name': 'Lemon Rice',
     'description': 'Zesty South Indian lemon rice',
     'instructions': '1. Cook rice. 2. Heat oil, add mustard seeds. 3. Add lemon juice. 4. Mix with rice.',
     'cooking_time_min': 20, 'estimated_cost': 45, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Cooking Oil', 2, 'tbsp')]},
    {'name': 'Spinach Rice Bowl',
     'description': 'Healthy rice bowl with wilted spinach',
     'instructions': '1. Cook rice. 2. Wilt spinach. 3. Combine. 4. Top with yogurt.',
     'cooking_time_min': 25, 'estimated_cost': 60, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Spinach', 150, 'g'), ('Yogurt', 3, 'tbsp')]},
    {'name': 'Coconut Rice',
     'description': 'South Indian coconut rice',
     'instructions': '1. Cook rice. 2. Roast grated coconut. 3. Mix with rice and curry leaves.',
     'cooking_time_min': 25, 'estimated_cost': 65, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Cooking Oil', 1, 'tbsp')]},
    {'name': 'Milk Rice Pudding',
     'description': 'Creamy rice pudding - comfort dessert',
     'instructions': '1. Boil milk. 2. Add cooked rice. 3. Simmer until thick. 4. Serve warm.',
     'cooking_time_min': 30, 'estimated_cost': 50, 'servings': 2,
     'ingredients': [('Rice', 0.5, 'cup'), ('Milk', 0.5, 'L')]},
    {'name': 'Veg Pulao',
     'description': 'Fragrant mixed vegetable rice',
     'instructions': '1. Saute onions, tomatoes. 2. Add rice and water. 3. Cook until fluffy.',
     'cooking_time_min': 35, 'estimated_cost': 90, 'servings': 3,
     'ingredients': [('Rice', 2, 'cup'), ('Onions', 1, 'pcs'), ('Tomatoes', 2, 'pcs'), ('Cooking Oil', 2, 'tbsp')]},

    # --- Egg dishes ---
    {'name': 'Tomato Omelette',
     'description': 'Fluffy omelette with tomatoes',
     'instructions': '1. Beat eggs. 2. Add tomatoes. 3. Cook on non-stick pan. 4. Fold.',
     'cooking_time_min': 10, 'estimated_cost': 40, 'servings': 1,
     'ingredients': [('Eggs', 2, 'pcs'), ('Tomatoes', 1, 'pcs'), ('Cooking Oil', 1, 'tsp')]},
    {'name': 'Veggie Scramble',
     'description': 'Scrambled eggs with vegetables',
     'instructions': '1. Beat eggs. 2. Add spinach and tomatoes. 3. Scramble.',
     'cooking_time_min': 12, 'estimated_cost': 45, 'servings': 1,
     'ingredients': [('Eggs', 2, 'pcs'), ('Spinach', 50, 'g'), ('Tomatoes', 1, 'pcs')]},
    {'name': 'Masala Omelette',
     'description': 'Spiced Indian omelette',
     'instructions': '1. Beat eggs with onions and tomatoes. 2. Add spices. 3. Cook.',
     'cooking_time_min': 12, 'estimated_cost': 50, 'servings': 1,
     'ingredients': [('Eggs', 2, 'pcs'), ('Onions', 0.5, 'pcs'), ('Tomatoes', 1, 'pcs')]},
    {'name': 'Egg Bhurji',
     'description': 'Indian scrambled eggs',
     'instructions': '1. Saute onions and tomatoes. 2. Add beaten eggs. 3. Scramble until cooked.',
     'cooking_time_min': 15, 'estimated_cost': 55, 'servings': 2,
     'ingredients': [('Eggs', 3, 'pcs'), ('Onions', 1, 'pcs'), ('Tomatoes', 1, 'pcs')]},

    # --- Dal / Lentils ---
    {'name': 'Dal Tadka',
     'description': 'Classic lentil soup with tempered spices',
     'instructions': '1. Boil lentils. 2. Heat oil, add onions. 3. Pour over dal. 4. Serve with rice.',
     'cooking_time_min': 35, 'estimated_cost': 70, 'servings': 3,
     'ingredients': [('Lentils (Dal)', 1, 'cup'), ('Onions', 1, 'pcs'), ('Cooking Oil', 2, 'tbsp'), ('Tomatoes', 1, 'pcs')]},
    {'name': 'Dal Fry',
     'description': 'Restaurant-style dal fry',
     'instructions': '1. Cook dal. 2. Fry onions, tomatoes, spices. 3. Mix and simmer.',
     'cooking_time_min': 30, 'estimated_cost': 75, 'servings': 3,
     'ingredients': [('Lentils (Dal)', 1, 'cup'), ('Onions', 1, 'pcs'), ('Tomatoes', 2, 'pcs')]},
    {'name': 'Chickpea Curry',
     'description': 'Protein-rich chickpea curry',
     'instructions': '1. Soak chickpeas. 2. Boil. 3. Cook with onion-tomato gravy.',
     'cooking_time_min': 45, 'estimated_cost': 75, 'servings': 3,
     'ingredients': [('Chickpeas', 1, 'cup'), ('Onions', 1, 'pcs'), ('Tomatoes', 2, 'pcs'), ('Cooking Oil', 2, 'tbsp')]},
    {'name': 'Rajma Masala',
     'description': 'Kidney bean curry',
     'instructions': '1. Soak rajma overnight. 2. Boil until soft. 3. Cook in tomato gravy.',
     'cooking_time_min': 50, 'estimated_cost': 85, 'servings': 3,
     'ingredients': [('Lentils (Dal)', 1, 'cup'), ('Onions', 1, 'pcs'), ('Tomatoes', 3, 'pcs')]},

    # --- Bread / Roti ---
    {'name': 'Aloo Paratha',
     'description': 'Stuffed flatbread with spiced potatoes',
     'instructions': '1. Mash potatoes. 2. Stuff in dough. 3. Cook on tawa with oil.',
     'cooking_time_min': 40, 'estimated_cost': 60, 'servings': 2,
     'ingredients': [('Wheat Flour', 2, 'cup'), ('Potatoes', 3, 'pcs'), ('Cooking Oil', 2, 'tbsp')]},
    {'name': 'Plain Paratha',
     'description': 'Layered Indian flatbread',
     'instructions': '1. Knead dough. 2. Roll and fold. 3. Cook with oil until golden.',
     'cooking_time_min': 25, 'estimated_cost': 35, 'servings': 2,
     'ingredients': [('Wheat Flour', 2, 'cup'), ('Cooking Oil', 2, 'tbsp')]},
    {'name': 'Vegetable Sandwich',
     'description': 'Fresh veggie sandwich',
     'instructions': '1. Toast bread. 2. Layer tomatoes and spinach. 3. Add yogurt spread.',
     'cooking_time_min': 10, 'estimated_cost': 40, 'servings': 1,
     'ingredients': [('Bread', 2, 'pcs'), ('Tomatoes', 1, 'pcs'), ('Spinach', 30, 'g'), ('Yogurt', 2, 'tbsp')]},

    # --- Curries / Sabzi ---
    {'name': 'Aloo Gobi',
     'description': 'Potato and cauliflower curry',
     'instructions': '1. Saute onions. 2. Add potatoes. 3. Add spices and simmer.',
     'cooking_time_min': 30, 'estimated_cost': 70, 'servings': 3,
     'ingredients': [('Potatoes', 3, 'pcs'), ('Onions', 1, 'pcs'), ('Tomatoes', 2, 'pcs')]},
    {'name': 'Palak Paneer',
     'description': 'Spinach and cottage cheese curry',
     'instructions': '1. Blanch spinach. 2. Puree. 3. Cook with spices and paneer.',
     'cooking_time_min': 40, 'estimated_cost': 120, 'servings': 3,
     'ingredients': [('Spinach', 250, 'g'), ('Onions', 1, 'pcs'), ('Tomatoes', 2, 'pcs')]},
    {'name': 'Mixed Veg Curry',
     'description': 'Seasonal vegetable curry',
     'instructions': '1. Chop vegetables. 2. Saute onions and tomatoes. 3. Add veggies and cook.',
     'cooking_time_min': 35, 'estimated_cost': 80, 'servings': 3,
     'ingredients': [('Potatoes', 2, 'pcs'), ('Tomatoes', 2, 'pcs'), ('Onions', 1, 'pcs'), ('Spinach', 100, 'g')]},
    {'name': 'Tomato Curry',
     'description': 'Simple tangy tomato curry',
     'instructions': '1. Saute onions. 2. Add tomatoes and spices. 3. Simmer until thick.',
     'cooking_time_min': 20, 'estimated_cost': 50, 'servings': 2,
     'ingredients': [('Tomatoes', 4, 'pcs'), ('Onions', 1, 'pcs'), ('Cooking Oil', 2, 'tbsp')]},

    # --- Breakfast / snacks ---
    {'name': 'Poha',
     'description': 'Flattened rice breakfast',
     'instructions': '1. Rinse poha. 2. Saute onions and tomatoes. 3. Add poha and mix.',
     'cooking_time_min': 15, 'estimated_cost': 35, 'servings': 2,
     'ingredients': [('Rice', 1, 'cup'), ('Onions', 1, 'pcs'), ('Tomatoes', 1, 'pcs')]},
    {'name': 'Upma',
     'description': 'Semolina breakfast porridge',
     'instructions': '1. Roast semolina. 2. Saute onions. 3. Add water and cook.',
     'cooking_time_min': 20, 'estimated_cost': 40, 'servings': 2,
     'ingredients': [('Wheat Flour', 1, 'cup'), ('Onions', 1, 'pcs'), ('Cooking Oil', 1, 'tbsp')]},
]
for r in recipes_data:
    recipe, _ = Recipe.objects.get_or_create(
        name=r['name'],
        defaults={
            'description': r['description'],
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

# =========================================================
# SHOPS (10) + OFFERS (24)
# =========================================================
shops_data = [
    ('Green Mart', 'MG Road', 12.9750, 77.6000),
    ('Fresh Bazaar', 'Indiranagar', 12.9784, 77.6408),
    ('Daily Needs', 'Koramangala', 12.9352, 77.6245),
    ('Organic Basket', 'Jayanagar', 12.9250, 77.5838),
    ('City Grocers', 'Whitefield', 12.9698, 77.7500),
    ('SuperMart Express', 'HSR Layout', 12.9121, 77.6446),
    ('Local Kirana', 'BTM Layout', 12.9166, 77.6101),
    ('Fresh Farm Store', 'JP Nagar', 12.9063, 77.5857),
    ('Quick Shop', 'Rajajinagar', 12.9916, 77.5522),
    ('Family Grocers', 'Malleshwaram', 13.0068, 77.5693),
]
for name, addr, lat, lng in shops_data:
    Shop.objects.get_or_create(
        name=name,
        defaults={'address': addr, 'latitude': lat, 'longitude': lng,
                  'is_verified': False, 'is_demo': True}
    )

shop1 = Shop.objects.get(name='Green Mart')
shop2 = Shop.objects.get(name='Fresh Bazaar')
shop3 = Shop.objects.get(name='Daily Needs')
shop4 = Shop.objects.get(name='Organic Basket')
shop5 = Shop.objects.get(name='City Grocers')
shop6 = Shop.objects.get(name='SuperMart Express')
shop7 = Shop.objects.get(name='Local Kirana')
shop8 = Shop.objects.get(name='Fresh Farm Store')
shop9 = Shop.objects.get(name='Quick Shop')
shop10 = Shop.objects.get(name='Family Grocers')

offers_data = [
    (shop1, 'Rice 5kg', 250, 50, 10),
    (shop1, 'Milk 1L', 45, 45, 5),
    (shop1, 'Cooking Oil 1L', 130, 130, 8),
    (shop2, 'Tomatoes 1kg', 30, 30, 20),
    (shop2, 'Eggs 12pcs', 70, 5.8, 15),
    (shop2, 'Onions 1kg', 25, 25, 12),
    (shop3, 'Wheat Flour 5kg', 240, 48, 10),
    (shop3, 'Yogurt 500g', 35, 35, 8),
    (shop4, 'Organic Spinach 250g', 40, 160, 5),
    (shop4, 'Organic Tomatoes 1kg', 55, 55, 10),
    (shop5, 'Lentils 1kg', 120, 120, 15),
    (shop5, 'Bread Loaf', 45, 45, 10),
    (shop6, 'Milk 1L', 42, 42, 8),
    (shop6, 'Potatoes 1kg', 28, 28, 12),
    (shop7, 'Rice 1kg', 55, 55, 5),
    (shop7, 'Eggs 6pcs', 38, 6.3, 10),
    (shop8, 'Fresh Spinach 500g', 55, 110, 12),
    (shop8, 'Fresh Tomatoes 1kg', 40, 40, 15),
    (shop9, 'Cooking Oil 1L', 125, 125, 10),
    (shop9, 'Onions 1kg', 24, 24, 15),
    (shop10, 'Bread Loaf', 40, 40, 12),
    (shop10, 'Rice 5kg', 245, 49, 8),
    (shop1, 'Eggs 6pcs', 40, 6.7, 8),
    (shop2, 'Cooking Oil 1L', 128, 128, 10),
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

# =========================================================
# SHELTERS (10)
# =========================================================
shelters_data = [
    {'name': 'Hope Foundation', 'address': 'Jayanagar',
     'latitude': 12.9250, 'longitude': 77.5938,
     'resident_count': 45, 'age_groups': ['children', 'elderly'],
     'needs': ['cooked_meals', 'rice', 'vegetables'],
     'dietary_requirements': ['soft foods for 8 residents'],
     'allergy_flags': ['peanut'], 'contact': '+91-9111111111', 'is_verified': True},
    {'name': 'Sunrise Shelter', 'address': 'Whitefield',
     'latitude': 12.9698, 'longitude': 77.7500,
     'resident_count': 30, 'age_groups': ['adults'],
     'needs': ['rice', 'eggs', 'milk'],
     'dietary_requirements': [],
     'allergy_flags': ['dairy'], 'contact': '+91-9222222222', 'is_verified': True},
    {'name': 'Care Home', 'address': 'HSR Layout',
     'latitude': 12.9121, 'longitude': 77.6446,
     'resident_count': 20, 'age_groups': ['elderly'],
     'needs': ['cooked_meals', 'milk'],
     'dietary_requirements': ['low-sugar meals'],
     'allergy_flags': [], 'contact': '+91-9333333333', 'is_verified': True},
    {'name': 'Asha Trust', 'address': 'Koramangala',
     'latitude': 12.9352, 'longitude': 77.6245,
     'resident_count': 55, 'age_groups': ['children'],
     'needs': ['cooked_meals', 'rice', 'lentils', 'vegetables'],
     'dietary_requirements': ['soft foods for 12 residents'],
     'allergy_flags': ['peanut', 'dairy'], 'contact': '+91-9444444444', 'is_verified': True},
    {'name': 'Sunshine Orphanage', 'address': 'Indiranagar',
     'latitude': 12.9784, 'longitude': 77.6408,
     'resident_count': 25, 'age_groups': ['children'],
     'needs': ['cooked_meals', 'milk', 'eggs'],
     'dietary_requirements': [],
     'allergy_flags': [], 'contact': '+91-9555555555', 'is_verified': False},
    {'name': 'Elder Care Center', 'address': 'MG Road',
     'latitude': 12.9750, 'longitude': 77.6000,
     'resident_count': 18, 'age_groups': ['elderly'],
     'needs': ['cooked_meals', 'soft_foods'],
     'dietary_requirements': ['low-salt meals for 5 residents'],
     'allergy_flags': [], 'contact': '+91-9666666666', 'is_verified': True},
    {'name': 'New Life Shelter', 'address': 'BTM Layout',
     'latitude': 12.9166, 'longitude': 77.6101,
     'resident_count': 40, 'age_groups': ['adults', 'children'],
     'needs': ['cooked_meals', 'rice', 'milk'],
     'dietary_requirements': [],
     'allergy_flags': ['dairy'], 'contact': '+91-9777777777', 'is_verified': True},
    {'name': 'Grace Home', 'address': 'JP Nagar',
     'latitude': 12.9063, 'longitude': 77.5857,
     'resident_count': 35, 'age_groups': ['elderly', 'adults'],
     'needs': ['cooked_meals', 'vegetables', 'lentils'],
     'dietary_requirements': ['low-oil meals for 6 residents'],
     'allergy_flags': [], 'contact': '+91-9888888888', 'is_verified': True},
    {'name': 'Seva Sadan', 'address': 'Malleshwaram',
     'latitude': 13.0068, 'longitude': 77.5693,
     'resident_count': 50, 'age_groups': ['children', 'adults'],
     'needs': ['cooked_meals', 'rice'],
     'dietary_requirements': ['soft foods for 15 residents'],
     'allergy_flags': ['peanut'], 'contact': '+91-9999999999', 'is_verified': True},
    {'name': 'Safe Haven', 'address': 'Rajajinagar',
     'latitude': 12.9916, 'longitude': 77.5522,
     'resident_count': 22, 'age_groups': ['adults'],
     'needs': ['cooked_meals', 'eggs', 'bread'],
     'dietary_requirements': [],
     'allergy_flags': [], 'contact': '+91-9000000001', 'is_verified': False},
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
            'is_verified': s['is_verified'],
            'is_demo': True,
        }
    )
print(f"  OK Shelters: {Shelter.objects.count()}")

# =========================================================
# DONATIONS (10)
# =========================================================
hope = Shelter.objects.get(name='Hope Foundation')
sunrise = Shelter.objects.get(name='Sunrise Shelter')
care = Shelter.objects.get(name='Care Home')
asha = Shelter.objects.get(name='Asha Trust')
newlife = Shelter.objects.get(name='New Life Shelter')
grace = Shelter.objects.get(name='Grace Home')

donations_data = [
    {'donor': main_user, 'shelter': hope, 'food_type': 'cooked_meals',
     'quantity': 5, 'unit': 'kg',
     'preparation_details': 'Freshly cooked, packed in sealed containers',
     'storage_conditions': 'Keep refrigerated',
     'ingredient_info': ['rice', 'vegetables'], 'allergen_info': [],
     'status': 'available'},
    {'donor': main_user, 'shelter': sunrise, 'food_type': 'rice',
     'quantity': 3, 'unit': 'kg',
     'preparation_details': 'Sealed 1kg packets, unopened',
     'storage_conditions': 'Room temperature',
     'ingredient_info': ['rice'], 'allergen_info': [],
     'status': 'reserved'},
    {'donor': main_user, 'shelter': care, 'food_type': 'milk',
     'quantity': 4, 'unit': 'L',
     'preparation_details': 'Pasteurized milk cartons',
     'storage_conditions': 'Refrigerated',
     'ingredient_info': ['milk'], 'allergen_info': ['dairy'],
     'status': 'collected'},
    {'donor': main_user, 'shelter': asha, 'food_type': 'cooked_meals',
     'quantity': 8, 'unit': 'kg',
     'preparation_details': 'Freshly cooked dal and rice',
     'storage_conditions': 'Keep refrigerated',
     'ingredient_info': ['rice', 'lentils'], 'allergen_info': [],
     'status': 'delivered'},
    {'donor': main_user, 'shelter': newlife, 'food_type': 'vegetables',
     'quantity': 2, 'unit': 'kg',
     'preparation_details': 'Fresh spinach and tomatoes',
     'storage_conditions': 'Cool, dry place',
     'ingredient_info': ['spinach', 'tomatoes'], 'allergen_info': [],
     'status': 'delivered'},
    {'donor': main_user, 'shelter': grace, 'food_type': 'lentils',
     'quantity': 3, 'unit': 'kg',
     'preparation_details': 'Sealed dal packets',
     'storage_conditions': 'Room temperature',
     'ingredient_info': ['lentils'], 'allergen_info': [],
     'status': 'available'},
    {'donor': other_user, 'shelter': hope, 'food_type': 'vegetables',
     'quantity': 2, 'unit': 'kg',
     'preparation_details': 'Fresh spinach and tomatoes',
     'storage_conditions': 'Cool, dry place',
     'ingredient_info': ['spinach', 'tomatoes'], 'allergen_info': [],
     'status': 'available'},
    {'donor': other_user, 'shelter': asha, 'food_type': 'rice',
     'quantity': 6, 'unit': 'kg',
     'preparation_details': 'Basmati rice, unopened',
     'storage_conditions': 'Room temperature',
     'ingredient_info': ['rice'], 'allergen_info': [],
     'status': 'delivered'},
    {'donor': other_user, 'shelter': newlife, 'food_type': 'milk',
     'quantity': 5, 'unit': 'L',
     'preparation_details': 'Fresh milk cartons',
     'storage_conditions': 'Refrigerated',
     'ingredient_info': ['milk'], 'allergen_info': ['dairy'],
     'status': 'reserved'},
    {'donor': other_user, 'shelter': sunrise, 'food_type': 'eggs',
     'quantity': 12, 'unit': 'pcs',
     'preparation_details': 'Fresh farm eggs, unopened tray',
     'storage_conditions': 'Cool place',
     'ingredient_info': ['eggs'], 'allergen_info': ['eggs'],
     'status': 'available'},
]
for d in donations_data:
    Donation.objects.get_or_create(
        donor=d['donor'],
        food_type=d['food_type'],
        quantity=d['quantity'],
        defaults={
            'shelter': d['shelter'],
            'unit': d['unit'],
            'preparation_details': d['preparation_details'],
            'storage_conditions': d['storage_conditions'],
            'ingredient_info': d['ingredient_info'],
            'allergen_info': d['allergen_info'],
            'collection_deadline': timezone.now() + timedelta(hours=12),
            'status': d['status'],
            'is_demo': True,
        }
    )
print(f"  OK Donations: {Donation.objects.count()}")

# =========================================================
# NOTIFICATIONS — welcome + activity
# =========================================================
notifications_data = [
    ('system', 'Hi demo! You have successfully logged in. Welcome to ZENVORA. 🌱'),
    ('expiry', 'Spinach expires tomorrow — plan a meal soon.'),
    ('expiry', 'Milk expires in 2 days.'),
    ('donation', 'Your donation to Asha Trust was delivered. Thank you!'),
    ('offer', 'Green Mart has 20% off on tomatoes today.'),
]
for notif_type, message in notifications_data:
    Notification.objects.get_or_create(
        user=main_user,
        message=message,
        defaults={
            'type': notif_type,
            'is_read': False,
            'event_key': f'seed_{notif_type}_{abs(hash(message))}',
        }
    )
print(f"  OK Notifications: {Notification.objects.filter(user=main_user).count()}")

# =========================================================
print("\n=== Seed complete! ===\n")
print("Users:")
print("  demo  / demo1234  (main)")
print("  aisha / aisha1234 (secondary)")
print(f"\nData: {Recipe.objects.count()} recipes, {Shop.objects.count()} shops, "
      f"{Offer.objects.count()} offers, {Shelter.objects.count()} shelters, "
      f"{Donation.objects.count()} donations, "
      f"{Notification.objects.filter(user=main_user).count()} notifications")
print("\nTest:")
print("  https://zenorva.onrender.com/login.html")
print("  https://zenorva.onrender.com/api/recipes/")
print("  https://zenorva.onrender.com/api/shelters/")