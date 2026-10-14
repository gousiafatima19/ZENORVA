"""
LLM wrapper for Ask ZENVORA.
- Uses Groq (Llama 3.1 70B) for natural, contextual answers.
- Falls back to NLP if the LLM fails (out of tokens, timeout, error).
- Strict system prompt: LLM must answer ONLY from provided DB context.
"""

import os
import logging

logger = logging.getLogger(__name__)

# --- Config -----------------------------------------------------------------
# NOTE: This must be a valid Groq model ID. See https://console.groq.com/docs/models
# Verified working models (as of writing):
#   - llama-3.1-70b-versatile
#   - llama-3.3-70b-versatile
#   - llama-3.1-8b-instant
LLM_MODEL = os.getenv('LLM_MODEL', 'llama-3.1-70b-versatile')

LLM_TIMEOUT = float(os.getenv('LLM_TIMEOUT', '10'))   # seconds
LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '200'))
LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.3'))


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


def _client():
    """Build a Groq client, or return None if unavailable."""
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
        # `timeout` is supported in groq>=0.9. Older SDKs use `timeout` too,
        # but if you hit a TypeError, upgrade: pip install -U groq
        return Groq(api_key=api_key, timeout=LLM_TIMEOUT)
    except Exception as e:
        logger.warning(f'Failed to initialise Groq client: {e}')
        return None


def ask_llm(question, db_context):
    """
    Call Groq LLM with question + context.

    Returns:
        str  — the model's answer
        None — if the LLM is unavailable (caller should use NLP fallback)
    """
    if not question or not str(question).strip():
        logger.info('Empty question — skipping LLM call')
        return None

    client = _client()
    if client is None:
        return None

    # Keep context bounded so we don't blow past token limits.
    context_str = str(db_context) if db_context is not None else '{}'
    if len(context_str) > 6000:
        context_str = context_str[:6000] + '…[truncated]'
        logger.info('DB context truncated to 6000 chars for LLM call')

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {
                    'role': 'user',
                    'content': (
                        f"Question: {question}\n\n"
                        f"Context (JSON):\n{context_str}"
                    ),
                },
            ],
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )

        # Defensive extraction — Groq responses are usually well-formed,
        # but we don't want a malformed one to crash the caller.
        if not response or not getattr(response, 'choices', None):
            logger.warning('LLM returned no choices — falling back to NLP')
            return None

        answer = (response.choices[0].message.content or '').strip()
        if not answer:
            logger.info('LLM returned empty answer — falling back to NLP')
            return None

        return answer

    except Exception as e:
        # Catches rate limits, token exhaustion, timeouts, network errors, etc.
        logger.warning(f'LLM call failed, falling back to NLP: {e}')
        return None
