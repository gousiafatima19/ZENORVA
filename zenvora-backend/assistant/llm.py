"""
LLM wrapper for Ask ZENVORA.
- Uses Groq (Llama 3.1 70B) for natural, contextual answers.
- Falls back to NLP if the LLM fails (out of tokens, timeout, error).
- Strict system prompt: LLM must answer ONLY from provided DB context.
"""

import os
import logging

logger = logging.getLogger(__name__)

LLM_MODEL = 'llama-3.1-8b-instant'
LLM_TIMEOUT = 10  # seconds


SYSTEM_PROMPT = """You are Ask ZENVORA, the assistant for a food rescue app.
Answer the user's question using ONLY the JSON context provided below.
Rules:
1. Never invent prices, shelter availability, or allergy-safety claims.
2. If the context does not contain the answer, say:
   "I don't have that information. Try asking about pantry, recipes, shelters, donations, or impact."
3. Keep answers short: 1-3 sentences.
4. Do not output JSON — write a friendly, plain-English answer.
5. If the context mentions demo data, mention "(demo data)" in your answer.
"""


def ask_llm(question, db_context):
    """
    Call Groq LLM with question + context.
    Returns answer string, or None if LLM is unavailable.
    """
    api_key = os.getenv('GROQ_API_KEY', '').strip()
    if not api_key:
        logger.info('GROQ_API_KEY not set — using NLP fallback')
        return None

    try:
        from groq import Groq
    except ImportError:
        logger.warning('groq package not installed — using NLP fallback')
        return None

    try:
        client = Groq(api_key=api_key, timeout=LLM_TIMEOUT)
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {
                    'role': 'user',
                    'content': (
                        f"Question: {question}\n\n"
                        f"Context (JSON):\n{db_context}"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=200,
        )
        answer = response.choices[0].message.content.strip()
        return answer or None
    except Exception as e:
        # This catches rate limits, token exhaustion, timeouts, network errors
        logger.warning(f'LLM call failed, falling back to NLP: {e}')
        return None