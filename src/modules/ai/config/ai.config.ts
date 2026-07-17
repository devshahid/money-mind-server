import { ChatOpenAI } from '@langchain/openai';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../../shared/constants';

/**
 * AI Configuration
 * Supports GitHub Copilot (via GitHub Models) and OpenAI
 */

export const AI_CONFIG = {
  // GitHub Copilot uses GitHub Models API
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_MODEL: process.env.GITHUB_MODEL || 'gpt-4o-mini', // GitHub Copilot models

  // OpenAI (fallback if not using GitHub)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Temperature for different use cases
  TEMPERATURE_CATEGORIZATION: 0.1, // Low temperature for consistent categorization
  TEMPERATURE_STRATEGY: 0.7, // Higher for creative debt strategies
  TEMPERATURE_CHAT: 0.8, // Higher for conversational responses
};

/**
 * Create LangChain LLM instance
 * Supports both GitHub Copilot and OpenAI
 */
export function createLLM(temperature = 0.7, useGitHub = true): ChatOpenAI {
  if (useGitHub && AI_CONFIG.GITHUB_TOKEN) {
    console.log('🤖 Using GitHub Copilot Models API');
    // Using GitHub Copilot via GitHub Models API
    return new ChatOpenAI({
      modelName: AI_CONFIG.GITHUB_MODEL,
      temperature,
      timeout: 25000, // 25s timeout to stay within API Gateway 29s limit
      apiKey: AI_CONFIG.GITHUB_TOKEN,
      configuration: {
        baseURL: 'https://models.inference.ai.azure.com',
      },
    });
  }

  if (AI_CONFIG.OPENAI_API_KEY) {
    console.log('🤖 Using OpenAI API');
    // Fallback to OpenAI
    return new ChatOpenAI({
      modelName: AI_CONFIG.OPENAI_MODEL,
      temperature,
      timeout: 25000, // 25s timeout to stay within API Gateway 29s limit
      apiKey: AI_CONFIG.OPENAI_API_KEY,
    });
  }

  throw new Error(
    'No AI API credentials configured. Please set GITHUB_TOKEN or OPENAI_API_KEY in .env file'
  );
}

/**
 * Available categories for transaction categorization
 * Imported from shared constants to maintain single source of truth
 * Synced with frontend: money-mind-client/src/constants/index.ts
 */
export const AVAILABLE_CATEGORIES = EXPENSE_CATEGORIES;
export type CategoryType = ExpenseCategory;
