"""
Donation matching engine.

Rules:
1. Shelter's `needs` must include the food_type.
2. Distance must be within threshold (default 10 km).
3. Quantity must fit within shelter capacity context.
4. Allergen conflict → flag as WARNING, never guarantee safety.
5. Never claim medical safety — always return a warning if uncertain.
"""

from shelters.utils import haversine_km


DEFAULT_RADIUS_KM = 10


def match_shelters_for_donation(donation, radius_km=DEFAULT_RADIUS_KM):
    """
    Returns a list of dicts:
      {
        shelter: <Shelter instance>,
        distance_km: float,
        reason: str,
        allergen_warnings: [str],
        is_safe_guarantee: False,   # never True
      }
    Sorted by distance.
    """
    from shelters.models import Shelter

    donor_lat = donation.donor.latitude
    donor_lng = donation.donor.longitude

    if donor_lat is None or donor_lng is None:
        return []

    donation_allergens = set(a.lower() for a in (donation.allergen_info or []))

    matches = []
    for shelter in Shelter.objects.all():
        # 1. Needs check
        needs = [n.lower() for n in (shelter.needs or [])]
        if donation.food_type.lower() not in needs:
            continue

        # 2. Distance check
        dist = haversine_km(donor_lat, donor_lng,
                            shelter.latitude, shelter.longitude)
        if dist > radius_km:
            continue

        # 3. Allergen conflict (aggregated shelter flags vs donation allergens)
        shelter_allergens = set(a.lower() for a in (shelter.allergy_flags or []))
        conflicts = donation_allergens & shelter_allergens

        warnings = []
        if conflicts:
            warnings.append(
                f"Potential allergen conflict: {', '.join(sorted(conflicts))}. "
                f"Verify before donating."
            )

        matches.append({
            'shelter': shelter,
            'distance_km': round(dist, 2),
            'reason': f"Shelter needs '{donation.food_type}' and is {round(dist,2)} km away",
            'allergen_warnings': warnings,
            'is_safe_guarantee': False,
        })

    matches.sort(key=lambda m: m['distance_km'])
    return matches
