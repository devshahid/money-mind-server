import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../shared/constants';

/**
 * AI Module Types and Interfaces
 */

// Category Suggestion Types
export interface CategorySuggestion {
  transactionId: string;
  narration: string;
  amount: number;
  currentCategory?: string;
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
}

export interface ApplySuggestionInput {
  transactionId: string;
  suggestedCategory: string;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  timestamp: Date;
}

// Debt Strategy Types
export interface DebtStrategyInput {
  monthlyIncome?: number;
  userId: string;
}

export interface DebtInfo {
  debtName: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyEMI: number;
  interestRate: number;
}

export interface DebtStrategyResult {
  totalDebt: number;
  monthlyIncome: number;
  totalEMI: number;
  availableForDebt: number;
  strategy: string;
  recommendations: string[];
  payoffTimeline: string;
  priorityDebts: Array<{
    debtName: string;
    priority: number;
    reasoning: string;
  }>;
}

// Budget Recommendation Types
export interface BudgetRecommendationInput {
  monthlyIncome?: number;
  userId: string;
}

export interface BudgetItem {
  category: string;
  planned: number;
  actual: number;
}

export interface SpendingHistoryItem {
  category: string;
  averageMonthly: number;
}

export interface BudgetRecommendation {
  category: string;
  recommendedAmount: number;
  currentAmount: number;
  reasoning: string;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
}

// Zod Schemas for Validation (used by AI service)
export const categorizationSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES as unknown as [string, ...string[]]),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reasoning: z.string().describe('Brief explanation for the categorization'),
});

export const batchCategorizationSchema = z.array(
  z.object({
    transactionId: z.string(),
    category: z.enum(EXPENSE_CATEGORIES as unknown as [string, ...string[]]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })
);

// Joi Schemas for Request Validation (used in validators)
export const CategoryType = EXPENSE_CATEGORIES;
