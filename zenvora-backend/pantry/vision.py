"""
Image recognition for food items.
Uses Google Gemini Vision to identify ingredients from a photo.
Falls back to a clear error message if no API key is set.
"""

import os
import base64
import logging
import json

logger = logging.getLogger(__name__)


VISION_PROMPT = """You are a food ingredient identifier.
Look at the image and list the food ingredients you can identify.
Respond ONLY with valid JSON, no markdown, no explanation:

{
  "ingredients": ["ingredient1", "ingredient2"],
  "confidence": "high" | "medium" | "low",
  "notes": "any uncertainties (e.g., 'label unclear', 'packaging obscures text')"
}

Rules:
- Use lowercase names.
- If the image is not food, return empty ingredients and note that.
- Never guess if you're not sure. Use confidence level "low" and mention it in notes.
- Do NOT claim the food is safe for anyone with allergies.
"""


def identify_ingredients(image_bytes, mime_type='image/jpeg'):
    """
    Send image to Gemini Vision and return a dict:
      { ingredients: [...], confidence, notes }
    Or None on failure.
    """
    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        logger.info('GEMINI_API_KEY not set - image recognition disabled')
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        response = model.generate_content([
            VISION_PROMPT,
            {'mime_type': mime_type, 'data': image_bytes},
        ])

        text = (response.text or '').strip()

        # Remove markdown code fences if present
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]
            text = text.strip()

        data = json.loads(text)
        return {
            'ingredients': data.get('ingredients', []),
            'confidence': data.get('confidence', 'low'),
            'notes': data.get('notes', ''),
        }
    except Exception as e:
        logger.warning(f'Image recognition failed: {e}')
        return None
