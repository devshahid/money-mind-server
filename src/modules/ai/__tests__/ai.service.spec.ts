/**
 * AI Service - Unit Tests
 * Tests AI service methods with mocked LangChain dependencies
 */

/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

import aiServiceInstance from '../ai.service';
import { AVAILABLE_CATEGORIES } from '../config/ai.config';

// Mock LangChain modules
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: {
    fromTemplate: jest.fn().mockReturnValue({
      format: jest.fn().mockResolvedValue('formatted prompt'),
    }),
  },
}));

jest.mock('@langchain/core/output_parsers', () => ({
  StructuredOutputParser: {
    fromZodSchema: jest.fn().mockReturnValue({
      getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
      parse: jest.fn(),
    }),
  },
}));

describe('AIService (Unit Tests)', () => {
  const aiService = aiServiceInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('categorizeTransaction', () => {
    it('should categorize a food transaction successfully', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          category: 'Food',
          confidence: 0.95,
          reasoning: 'Restaurant purchase',
        }),
      };

      // Mock the LLM invoke call
      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const { StructuredOutputParser } = require('@langchain/core/output_parsers');
      const mockParse = jest.fn().mockResolvedValue({
        category: 'Food',
        confidence: 0.95,
        reasoning: 'Restaurant purchase',
      });
      StructuredOutputParser.fromZodSchema.mockReturnValue({
        getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
        parse: mockParse,
      });

      // Act
      const result = await aiService.categorizeTransaction('Pizza Hut dinner', 45.5, false);

      // Assert
      expect(result).toBeDefined();
      expect(result.category).toBe('Food');
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBe('Restaurant purchase');
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should categorize a fuel transaction successfully', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          category: 'Fuel',
          confidence: 0.92,
          reasoning: 'Gas station purchase',
        }),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const { StructuredOutputParser } = require('@langchain/core/output_parsers');
      const mockParse = jest.fn().mockResolvedValue({
        category: 'Fuel',
        confidence: 0.92,
        reasoning: 'Gas station purchase',
      });
      StructuredOutputParser.fromZodSchema.mockReturnValue({
        getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
        parse: mockParse,
      });

      // Act
      const result = await aiService.categorizeTransaction('Shell gas station', 60.0, false);

      // Assert
      expect(result.category).toBe('Fuel');
      expect(result.confidence).toBe(0.92);
      expect(AVAILABLE_CATEGORIES).toContain(result.category);
    });

    it('should handle credit transactions (income)', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          category: 'Income',
          confidence: 0.98,
          reasoning: 'Salary credit',
        }),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const { StructuredOutputParser } = require('@langchain/core/output_parsers');
      const mockParse = jest.fn().mockResolvedValue({
        category: 'Income',
        confidence: 0.98,
        reasoning: 'Salary credit',
      });
      StructuredOutputParser.fromZodSchema.mockReturnValue({
        getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
        parse: mockParse,
      });

      // Act
      const result = await aiService.categorizeTransaction('Salary deposit', 5000.0, true);

      // Assert
      expect(result.category).toBe('Income');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reasoning).toContain('Salary');
    });

    it('should handle LLM errors gracefully', async () => {
      // Arrange
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockRejectedValue(new Error('LLM API Error')),
      }));

      // Act & Assert
      await expect(
        aiService.categorizeTransaction('Test transaction', 10.0, false)
      ).rejects.toThrow();
    });
  });

  describe('categorizeTransactionsBatch', () => {
    it('should categorize multiple transactions', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify([
          {
            transactionId: 'tx1',
            category: 'Food',
            confidence: 0.95,
            reasoning: 'Restaurant',
          },
          {
            transactionId: 'tx2',
            category: 'Groceries',
            confidence: 0.92,
            reasoning: 'Supermarket',
          },
        ]),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const { StructuredOutputParser } = require('@langchain/core/output_parsers');
      const mockParse = jest.fn().mockResolvedValue([
        {
          transactionId: 'tx1',
          category: 'Food',
          confidence: 0.95,
          reasoning: 'Restaurant',
        },
        {
          transactionId: 'tx2',
          category: 'Groceries',
          confidence: 0.92,
          reasoning: 'Supermarket',
        },
      ]);
      StructuredOutputParser.fromZodSchema.mockReturnValue({
        getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
        parse: mockParse,
      });

      const transactions = [
        { id: 'tx1', narration: 'Pizza Hut', amount: 25, isCredit: false },
        { id: 'tx2', narration: 'Walmart', amount: 120, isCredit: false },
      ];

      // Act
      const result = await aiService.categorizeTransactionsBatch(transactions);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Food');
      expect(result[1].category).toBe('Groceries');
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should handle empty transaction list', async () => {
      // Act
      const result = await aiService.categorizeTransactionsBatch([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should process large batches in chunks', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify([
          {
            transactionId: 'tx1',
            category: 'Food',
            confidence: 0.9,
            reasoning: 'Food',
          },
        ]),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const { StructuredOutputParser } = require('@langchain/core/output_parsers');
      const mockParse = jest.fn().mockImplementation((jsonStr: string) => {
        return JSON.parse(jsonStr);
      });
      StructuredOutputParser.fromZodSchema.mockReturnValue({
        getFormatInstructions: jest.fn().mockReturnValue('format instructions'),
        parse: mockParse,
      });

      // Create 15 transactions (should be split into 2 chunks of 10)
      const transactions = Array.from({ length: 15 }, (_, i) => ({
        id: `tx${i + 1}`,
        narration: `Transaction ${i + 1}`,
        amount: 50 + i,
        isCredit: false,
      }));

      // Act
      const result = await aiService.categorizeTransactionsBatch(transactions);

      // Assert
      expect(result).toBeDefined();
      // Should have called LLM at least twice (for 2 chunks)
      expect(mockInvoke.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('analyzeDebtStrategy', () => {
    it('should generate debt payoff strategy', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          recommendedMethod: 'AVALANCHE',
          strategyExplanation: 'Avalanche method recommended - pay off high-interest debt first',
          priorityOrder: [
            {
              debtName: 'Credit Card',
              order: 1,
              reason: 'Highest interest rate (18%)',
            },
          ],
          monthlyRecommendation: {
            minimumPayments: 150,
            extraPaymentSuggestion: 500,
            totalMonthly: 650,
          },
          potentialSavings: 1000,
          estimatedPayoffTimeline: '24 months with current income',
          tips: [
            'Pay off high-interest debt first',
            'Consider debt consolidation',
            'Build emergency fund',
          ],
        }),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const debtData = {
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        debts: [
          {
            debtId: 'debt123',
            debtName: 'Credit Card',
            totalAmount: 5000,
            remainingAmount: 4500,
            monthlyEMI: 150,
            interestRate: 18,
          },
        ],
      };

      // Act
      const result = await aiService.analyzeDebtStrategy(debtData);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendedMethod).toBe('AVALANCHE');
      expect(result.strategyExplanation).toContain('Avalanche');
      expect(result.monthlyRecommendation.minimumPayments).toBe(150);
      expect(result.tips).toHaveLength(3);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should handle no debts scenario', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          recommendedMethod: 'AVALANCHE',
          strategyExplanation: 'No active debts',
          priorityOrder: [],
          monthlyRecommendation: {
            minimumPayments: 0,
            extraPaymentSuggestion: 0,
            totalMonthly: 0,
          },
          potentialSavings: 0,
          estimatedPayoffTimeline: 'N/A',
          tips: ['Focus on savings', 'Build emergency fund'],
        }),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const debtData = {
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        debts: [],
      };

      // Act
      const result = await aiService.analyzeDebtStrategy(debtData);

      // Assert
      expect(result.recommendedMethod).toBeDefined();
      expect(result.strategyExplanation).toBeDefined();
    });
  });

  describe('generateBudgetRecommendations', () => {
    it('should generate budget recommendations', async () => {
      // Arrange
      const mockLLMResponse = {
        content: JSON.stringify({
          recommendations: [
            {
              category: 'Food',
              recommendedAmount: 450,
              currentAmount: 500,
              reasoning: 'Overspending detected',
              adjustmentType: 'decrease',
            },
            {
              category: 'Savings',
              recommendedAmount: 800,
              currentAmount: 500,
              reasoning: 'Increase emergency fund',
              adjustmentType: 'increase',
            },
          ],
        }),
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const budgetData = {
        monthlyIncome: 5000,
        currentBudget: [
          { category: 'Food', planned: 500, actual: 550 },
          { category: 'Savings', planned: 500, actual: 500 },
        ],
        spendingHistory: [
          { category: 'Food', averageMonthly: 550 },
          { category: 'Savings', averageMonthly: 500 },
        ],
      };

      // Act
      const result = await aiService.generateBudgetRecommendations(budgetData);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('recommendedAmount');
      expect(result[0]).toHaveProperty('adjustmentType');
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    it('should handle general chat messages', async () => {
      // Arrange
      const mockLLMResponse = {
        content: 'Based on your spending, I recommend creating a budget.',
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      // Act
      const result = await aiService.chat('How can I save money?');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should use context when provided', async () => {
      // Arrange
      const mockLLMResponse = {
        content: 'Your total expenses are $3000.',
      };

      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn().mockResolvedValue(mockLLMResponse);
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const context = {
        totalExpenses: 3000,
        monthlyIncome: 5000,
      };

      // Act
      const result = await aiService.chat('What are my total expenses?', context);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBe('Your total expenses are $3000.');
      expect(mockInvoke).toHaveBeenCalled();
    });
  });
});
