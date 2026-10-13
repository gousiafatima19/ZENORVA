"""
Response generator for Ask ZENVORA.

Two paths:
1. Hybrid (LLM first, NLP fallback) → answer_question_hybrid()
2. Pure NLP → answer_question() — used as fallback and for testing
"""

import json
from datetime import timedelta

from django.utils import timezone
from django.db.models import Sum

from .nlp import classify, extract_numbers
from .llm import ask_llm


# ============ PUBLIC ENTRY POINT (used by views) ============

def answer_question_hybrid(user, question):
    """
    Try LLM first (with DB context). Fall back to NLP if LLM fails.
    Returns dict: { answer, source, data }
    """
    context = _build_context(user)
    llm_answer = ask_llm(question, json.dumps(context, default=str))
    if llm_answer:
        return {
            'answer': llm_answer,
            'source': 'llm',
            'data': context,
        }

    # Fallback to NLP
    result = answer_question(user, question)
    result['source'] = f"nlp_fallback:{result.get('source', 'unknown')}"
    return result


# ============ PURE NLP FALLBACK ============

def answer_question(user, question):
    intent = classify(question)
    numbers = extract_numbers(question)

    if intent == 'pantry_expiry':
        return _pantry_expiry(user)
    if intent == 'recipe_suggest':
        return _recipe_suggest(user, numbers)
    if intent == 'recipe_budget':
        return _recipe_budget(user, numbers)
    if intent == 'shelter_nearby':
        return _shelter_nearby(user)
    if intent == 'donation_help':
        return _donation_help(user)
    if intent == 'impact':
        return _impact(user)
    if intent == 'dietary_info':
        return _dietary_info(user)
    if intent == 'shops_offers':
        return _shops_offers(user)
    return _help()


def _pantry_expiry(user):
    from pantry.models import PantryItem
    soon = timezone.now().date() + timedelta(days=3)
    items = PantryItem.objects.filter(
        user=user, expiry_date__lte=soon
    ).order_by('expiry_date')[:5]

    if not items:
        return {
            'answer': "Nothing in your pantry is expiring in the next 3 days.",
            'source': 'pantry_db',
            'data': [],
        }

    names = [f"{i.name} ({i.expiry_date})" for i in items]
    return {
        'answer': f"Expiring soon: {', '.join(names)}.",
        'source': 'pantry_db',
        'data': [{'name': i.name, 'expiry_date': str(i.expiry_date)} for i in items],
    }


def _recipe_suggest(user, numbers):
    from recipes.services import recommend_recipes
    max_time = int(numbers[0]) if numbers else None
    ranked = recommend_recipes(user, max_time=max_time)[:3]

    if not ranked:
        return {
            'answer': "I couldn't find recipes matching your pantry. Try adding more items.",
            'source': 'recipe_engine',
            'data': [],
        }

    names = [r['recipe'].name for r in ranked]
    return {
        'answer': f"Try: {', '.join(names)}. Tap any to see full steps.",
        'source': 'recipe_engine',
        'data': [{'id': r['recipe'].id, 'name': r['recipe'].name,
                  'cost': r['cost'], 'prep_time': r['prep_time']} for r in ranked],
    }


def _recipe_budget(user, numbers):
    from recipes.services import recommend_recipes
    max_cost = numbers[0] if numbers else 100
    ranked = recommend_recipes(user, max_cost=max_cost)[:3]

    if not ranked:
        return {
            'answer': f"No recipes under Rs.{max_cost} match your pantry right now.",
            'source': 'recipe_engine',
            'data': [],
        }

    names = [f"{r['recipe'].name} (Rs.{r['cost']})" for r in ranked]
    return {
        'answer': f"Under Rs.{max_cost}: {', '.join(names)}.",
        'source': 'recipe_engine',
        'data': [{'id': r['recipe'].id, 'name': r['recipe'].name,
                  'cost': r['cost']} for r in ranked],
    }


def _shelter_nearby(user):
    from shelters.models import Shelter
    shelters = Shelter.objects.all()[:3]
    if not shelters:
        return {'answer': "No shelters are registered yet.",
                'source': 'shelter_db', 'data': []}

    names = [f"{s.name} ({s.resident_count} residents)" for s in shelters]
    return {
        'answer': f"Nearby shelters: {', '.join(names)}.",
        'source': 'shelter_db',
        'data': [{'id': s.id, 'name': s.name, 'resident_count': s.resident_count,
                  'needs': s.needs} for s in shelters],
    }


def _donation_help(user):
    from donations.models import Donation
    active = Donation.objects.filter(donor=user).exclude(status='delivered').count()
    return {
        'answer': (f"You have {active} active donation(s). "
                   f"Create one via POST /api/donations/ or check the Donations page."),
        'source': 'donation_db',
        'data': [{'active_donations': active}],
    }


def _impact(user):
    from donations.models import Donation
    delivered = Donation.objects.filter(status='delivered')
    total_kg = delivered.aggregate(total=Sum('quantity'))['total'] or 0
    return {
        'answer': (f"So far, {delivered.count()} donations delivered, "
                   f"{round(total_kg,1)} kg rescued."),
        'source': 'impact_db',
        'data': [{'delivered_count': delivered.count(), 'quantity_kg': round(total_kg, 1)}],
    }


def _dietary_info(user):
    from dietary.models import DietaryProfile
    try:
        p = DietaryProfile.objects.get(user=user)
        return {
            'answer': (f"Your profile: allergies={p.allergies or []}, "
                       f"preferences={p.preferences or []}."),
            'source': 'dietary_db',
            'data': [{'allergies': p.allergies, 'preferences': p.preferences}],
        }
    except DietaryProfile.DoesNotExist:
        return {'answer': "No dietary profile set. Add one to get safer recommendations.",
                'source': 'dietary_db', 'data': []}


def _shops_offers(user):
    from shops.models import Offer
    offers = Offer.objects.all()[:3]
    if not offers:
        return {'answer': "No offers available right now.",
                'source': 'shop_db', 'data': []}
    names = [f"{o.item_name} @ Rs.{o.price} ({o.shop.name})" for o in offers]
    return {
        'answer': f"Current offers: {', '.join(names)}.",
        'source': 'shop_db',
        'data': [{'item': o.item_name, 'price': o.price,
                  'shop': o.shop.name, 'discount': o.discount_percent} for o in offers],
    }


def _help():
    return {
        'answer': ("I can help with: pantry expiry, recipe suggestions, "
                   "budget meals, nearby shelters, donations, impact stats, "
                   "dietary info, and shop offers. Try asking "
                   "\"what's expiring?\" or \"cheap meals under 100\"."),
        'source': 'help',
        'data': [],
    }


# ============ DB CONTEXT BUILDER FOR LLM ============

def _build_context(user):
    """Compact DB snapshot for the LLM prompt. Keeps tokens low."""
    from pantry.models import PantryItem
    from donations.models import Donation
    from recipes.models import Recipe
    from shelters.models import Shelter
    from dietary.models import DietaryProfile

    ctx = {}

    try:
        ctx['pantry'] = list(
            PantryItem.objects.filter(user=user)
            .values('name', 'quantity', 'unit', 'expiry_date')[:10]
        )
    except Exception:
        ctx['pantry'] = []

    try:
        ctx['recipes'] = list(
            Recipe.objects.values('name', 'cooking_time_min', 'estimated_cost')[:10]
        )
    except Exception:
        ctx['recipes'] = []

    try:
        ctx['shelters'] = list(
            Shelter.objects.values('name', 'needs', 'resident_count')[:10]
        )
    except Exception:
        ctx['shelters'] = []

    try:
        d = Donation.objects.filter(status='delivered')
        ctx['impact'] = {
            'delivered_count': d.count(),
            'quantity_kg': round(d.aggregate(t=Sum('quantity'))['t'] or 0, 1),
        }
    except Exception:
        ctx['impact'] = {}

    try:
        p = DietaryProfile.objects.get(user=user)
        ctx['dietary'] = {'allergies': p.allergies, 'preferences': p.preferences}
    except DietaryProfile.DoesNotExist:
        ctx['dietary'] = {}
    except Exception:
        ctx['dietary'] = {}

    return ctx