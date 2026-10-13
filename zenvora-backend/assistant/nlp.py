import re


INTENTS = [
    ('pantry_expiry', [r'\bexpir', r'\bgoing bad\b', r'\bspoil', r'\buse soon\b']),
    ('recipe_suggest', [r'\bcook\b', r'\brecipe', r'\bmake\b', r'\bwhat can i (cook|make)']),
    ('recipe_budget', [r'\bcheap', r'\bbudget', r'\bunder \d', r'\baffordable']),
    ('shelter_nearby', [r'\bshelter', r'\bwho needs food\b', r'\bnear.*shelter']),
    ('donation_help', [r'\bdonat', r'\bgive food\b', r'\bsurplus\b']),
    ('impact', [r'\bimpact\b', r'\bhow much.*(saved|donated)', r'\bstats?\b']),
    ('dietary_info', [r'\ballerg', r'\bvegetarian\b', r'\bvegan\b', r'\bdiet']),
    ('shops_offers', [r'\bshop', r'\boffer', r'\bdiscount', r'\bdeal']),
]


def classify(text):
    text = (text or '').lower()
    for intent, patterns in INTENTS:
        for p in patterns:
            if re.search(p, text):
                return intent
    return 'help'


def extract_numbers(text):
    return [float(n) for n in re.findall(r'\d+(?:\.\d+)?', text or '')]