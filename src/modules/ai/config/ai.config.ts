import { ChatOpenAI } from '@langchain/openai';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../../shared/constants';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Types } from 'mongoose';
import { AIUserConfig } from '../../ai-config/models/ai-user-config.model';
import { decrypt } from '../../../shared/utils/encryption.util';

/**
 * AI Configuration
 * Supports Ollama (local), OpenAI, or any OpenAI-compatible API
 */

export const AI_CONFIG = {
  // Ollama (local LLM) — native API (no /v1 suffix)
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen3:8b',

  // OpenAI (cloud fallback)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Temperature for different use cases
  TEMPERATURE_CATEGORIZATION: 0.1, // Low temperature for consistent categorization
  TEMPERATURE_STRATEGY: 0.7, // Higher for creative debt strategies
  TEMPERATURE_CHAT: 0.8, // Higher for conversational responses
};

/**
 * Create LangChain LLM instance
 * Priority: Ollama (local) → OpenAI (cloud)
 */
export function createLLM(temperature = 0.7): BaseChatModel {
  if (AI_CONFIG.OLLAMA_BASE_URL) {
    console.info(`🤖 Using Ollama -> ${AI_CONFIG.OLLAMA_MODEL}`);
    return new ChatOllama({
      model: AI_CONFIG.OLLAMA_MODEL,
      baseUrl: AI_CONFIG.OLLAMA_BASE_URL,
      temperature,
    });
  }

  if (AI_CONFIG.OPENAI_API_KEY) {
    console.log('🤖 Using OpenAI API');
    return new ChatOpenAI({
      modelName: AI_CONFIG.OPENAI_MODEL,
      temperature,
      timeout: 25000,
      apiKey: AI_CONFIG.OPENAI_API_KEY,
    });
  }

  throw new Error(
    'No AI provider configured. Please ensure Ollama is running or set OPENAI_API_KEY in .env file'
  );
}

/**
 * Resolve the LLM to use for a given user.
 *
 * If the user has an active Gemini configuration, decrypts their stored API key and
 * returns a ChatGoogleGenerativeAI instance for it. Otherwise (no userId, no config,
 * inactive config, or a decryption failure) falls back to the existing createLLM()
 * behavior unchanged (Ollama/OpenAI). Never logs or returns the decrypted API key.
 */
export async function resolveLLM(
  userId: Types.ObjectId | string | undefined,
  temperature = 0.7
): Promise<BaseChatModel> {
  if (!userId) return createLLM(temperature);

  const config = await AIUserConfig.findOne({ userId, isActive: true }).select(
    '+encryptedApiKey +apiKeyIv +apiKeyAuthTag'
  );

  if (!config) return createLLM(temperature);

  try {
    const apiKey = decrypt({
      ciphertext: config.encryptedApiKey,
      iv: config.apiKeyIv,
      authTag: config.apiKeyAuthTag,
    });

    // Loaded lazily so modules that never resolve a Gemini config (e.g. local
    // dev/tests using the Ollama/OpenAI fallback) never pay for/trigger this import.
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    console.info(`🤖 Using Gemini -> ${config.model}`);
    return new ChatGoogleGenerativeAI({ apiKey, model: config.model, temperature });
  } catch (error) {
    console.error(
      'Failed to resolve user Gemini configuration, falling back to default LLM:',
      (error as Error)?.message
    );
    return createLLM(temperature);
  }
}

/**
 * Available categories for transaction categorization
 * Imported from shared constants to maintain single source of truth
 * Synced with frontend: money-mind-client/src/constants/index.ts
 */
export const AVAILABLE_CATEGORIES = EXPENSE_CATEGORIES;
export type CategoryType = ExpenseCategory;
