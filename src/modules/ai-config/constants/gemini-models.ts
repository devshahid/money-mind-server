/**
 * Centralized, explicit allow-list of Gemini model IDs supported in V1.
 * No dynamic model discovery — update this list when adding/removing supported models.
 *
 * gemini-2.5-pro/flash/flash-lite were removed after live API-key verification showed
 * Google now returns 404 "no longer available to new users" for the entire 2.5 family.
 * gemini-3.1-pro-preview is intentionally excluded — the verified key has 0 free-tier
 * quota for Pro-tier models (429 RESOURCE_EXHAUSTED).
 */
export const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

/**
 * Gemini's actively-maintained OpenAI-compatible REST endpoint (ai.google.dev/gemini-api/docs/openai).
 * Used via @langchain/openai instead of @langchain/google-genai, which depends on the
 * deprecated/unmaintained @google/generative-ai SDK (legacy since Nov 30, 2025) and fails
 * with 404s for current Gemini models. Accepts the same Gemini API keys and model IDs.
 */
export const GEMINI_OPENAI_COMPAT_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/';
