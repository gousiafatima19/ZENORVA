"""
LLM wrapper for Ask ZENVORA.

Order of attempts:
1. Google Gemini (using GEMINI_LLM_KEY — Person 1's separate project)
2. Google Gemini (using GEMINI_API_KEY  — fallback, shares project with scanner)
3. Groq (using GROQ_API_KEY — legacy fallback)
4. NLP (always works, no external service)

Strict system prompt: LLM must answer ONLY from provided DB context.
"""

import os
import logging

logger = logging.getLogger(__name__)

# ---------- Model config ----------
GEMINI_MODEL = 'gemini-2.0-flash'
GROQ_MODEL = 'openai/gpt-oss-120b'
LLM_TIMEOUT = 15


SYSTEM_PROMPT = """You are Ask ZENVORA, the assistant for a food rescue app.
Answer the user's question using ONLY the JSON context provided below.
Rules:
1. Never invent prices, shelter availability, or allergy-safety claims.
2. If the context does not contain the answer, say:
   "I don't have that information. Try asking about pantry, recipes, shelters, donations, or impact."
3. Keep answers short: 1-3 sentences.
4. Do not output JSON - write a friendly, plain-English answer.
5. If the context mentions demo data, mention "(demo data)" in your answer.
"""


# =========================================================
# PUBLIC ENTRY POINT
# =========================================================
def ask_llm(question, db_context):
    """
    Try Gemini (Person 1's key) -> Gemini (shared key) -> Groq -> return None.
    """
    # 1. Gemini with Person 1's dedicated key
    answer = _try_gemini(question, db_context, 'GEMINI_LLM_KEY', 'gemini-llm')
    if answer:
        return answer

    # 2. Gemini with the shared scanner key
    answer = _try_gemini(question, db_context, 'GEMINI_API_KEY', 'gemini-shared')
    if answer:
        return answer

    # 3. Groq fallback
    answer = _try_groq(question, db_context)
    if answer:
        return answer

    # 4. Everything failed - caller will use NLP
    return None


# =========================================================
# PROVIDER IMPLEMENTATIONS
# =========================================================
def _try_gemini(question, db_context, env_var, source_label):
    """Try a Google Gemini call using the API key from the given env var."""
    api_key = os.getenv(env_var, '').strip()
    if not api_key:
        logger.info(f'{env_var} not set - skipping {source_label}')
        return None

    try:
        import google.generativeai as genai
    except ImportError:
        logger.warning('google-generativeai not installed - skipping Gemini')
        return None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Question: {question}\n\n"
            f"Context (JSON):\n{db_context}"
        )

        response = model.generate_content(
            prompt,
            generation_config={
                'temperature': 0.3,
                'max_output_tokens': 300,
            },
        )
        answer = (response.text or '').strip()
        if answer:
            logger.info(f'LLM answer via {source_label}')
            return answer
        return None
    except Exception as e:
        logger.warning(
            f'Gemini call failed [{source_label} / model={GEMINI_MODEL}]: '
            f'{type(e).__name__}: {e}'
        )
        return None


def _try_groq(question, db_context):
    """Legacy Groq fallback."""
    api_key = os.getenv('GROQ_API_KEY', '').strip()
    if not api_key:
        logger.info('GROQ_API_KEY not set - skipping Groq')
        return None

    try:
        from groq import Groq
    except ImportError:
        logger.warning('groq package not installed - skipping Groq')
        return None

    try:
        client = Groq(api_key=api_key, timeout=LLM_TIMEOUT)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
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
        if answer:
            logger.info('LLM answer via groq')
            return answer
        return None
    except Exception as e:
        logger.warning(
            f'Groq call failed [model={GROQ_MODEL}]: '
            f'{type(e).__name__}: {e}'
        )
        return None