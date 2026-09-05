/**
 * Centralized, explicit allow-list of Gemini model IDs supported in V1.
 * No dynamic model discovery — update this list when adding/removing supported models.
 */
export const GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];
