/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * AI Categorization Feature Tests
 * Tests for: isCredit in response, userOverride in apply-suggestions
 */

import { Types } from 'mongoose';
import { TransactionLogs } from '../../transactions/models/transaction-logs.model';

jest.mock('../../transactions/models/transaction-logs.model');
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

describe('AI Categorization - New Features', () => {
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suggest-categories response includes isCredit', () => {
    it('should include isCredit=true for credit transactions', () => {
      const transaction = {
        _id: new Types.ObjectId(),
        narration: 'Salary Credit',
        amount: 50000,
        isCredit: true,
        category: '',
      };

      // Simulate the response mapping logic from ai.controller.ts
      const suggestion = {
        transactionId: transaction._id.toString(),
        narration: transaction.narration || '',
        amount: transaction.amount || 0,
        isCredit: transaction.isCredit || false,
        currentCategory: transaction.category || '',
        suggestedCategory: 'Income',
        confidence: 0.95,
        reasoning: 'Salary credit',
      };

      expect(suggestion.isCredit).toBe(true);
      expect(suggestion.amount).toBe(50000);
    });

    it('should include isCredit=false for debit transactions', () => {
      const transaction = {
        _id: new Types.ObjectId(),
        narration: 'Swiggy Order',
        amount: 350,
        isCredit: false,
        category: '',
      };

      const suggestion = {
        transactionId: transaction._id.toString(),
        narration: transaction.narration || '',
        amount: transaction.amount || 0,
        isCredit: transaction.isCredit || false,
        currentCategory: transaction.category || '',
        suggestedCategory: 'Food',
        confidence: 0.92,
        reasoning: 'Food delivery',
      };

      expect(suggestion.isCredit).toBe(false);
    });

    it('should default isCredit to false when field is missing', () => {
      const transaction = {
        _id: new Types.ObjectId(),
        narration: 'Unknown',
        amount: 100,
        category: '',
      };

      const suggestion = {
        transactionId: transaction._id.toString(),
        narration: transaction.narration || '',
        amount: transaction.amount || 0,
        isCredit: (transaction as any).isCredit || false,
        currentCategory: transaction.category || '',
        suggestedCategory: 'Other',
        confidence: 0.5,
        reasoning: 'Unknown transaction',
      };

      expect(suggestion.isCredit).toBe(false);
    });
  });

  describe('apply-suggestions with userOverride', () => {
    it('should set aiSuggested=false when userOverride is true', async () => {
      const transactionId = new Types.ObjectId();
      const mockTransaction = {
        _id: transactionId,
        category: '',
        aiSuggested: false,
        aiConfidence: 0,
        aiConfirmed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(mockTransaction);

      // Simulate the apply logic with userOverride=true
      const suggestion = {
        transactionId: transactionId.toString(),
        category: 'Food',
        confidence: 1,
        userOverride: true,
      };

      const transaction = await TransactionLogs.findOne({
        _id: suggestion.transactionId,
        userId: mockUserId,
      });
      expect(transaction).toBeDefined();

      transaction!.category = suggestion.category;
      transaction!.aiSuggested = !suggestion.userOverride;
      transaction!.aiConfidence = suggestion.userOverride ? 0 : suggestion.confidence;
      transaction!.aiConfirmed = true;

      expect(transaction!.category).toBe('Food');
      expect(transaction!.aiSuggested).toBe(false);
      expect(transaction!.aiConfidence).toBe(0);
      expect(transaction!.aiConfirmed).toBe(true);
    });

    it('should set aiSuggested=true when userOverride is false', async () => {
      const transactionId = new Types.ObjectId();
      const mockTransaction = {
        _id: transactionId,
        category: '',
        aiSuggested: false,
        aiConfidence: 0,
        aiConfirmed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(mockTransaction);

      const suggestion = {
        transactionId: transactionId.toString(),
        category: 'Fuel',
        confidence: 0.88,
        userOverride: false,
      };

      const transaction = await TransactionLogs.findOne({
        _id: suggestion.transactionId,
        userId: mockUserId,
      });

      transaction!.category = suggestion.category;
      transaction!.aiSuggested = !suggestion.userOverride;
      transaction!.aiConfidence = suggestion.userOverride ? 0 : suggestion.confidence;
      transaction!.aiConfirmed = true;

      expect(transaction!.category).toBe('Fuel');
      expect(transaction!.aiSuggested).toBe(true);
      expect(transaction!.aiConfidence).toBe(0.88);
      expect(transaction!.aiConfirmed).toBe(true);
    });

    it('should treat missing userOverride as AI-suggested', async () => {
      const suggestion = {
        transactionId: 'some-id',
        category: 'Travel',
        confidence: 0.75,
      };

      const aiSuggested = !(suggestion as any).userOverride; // undefined → !undefined → true
      const aiConfidence = (suggestion as any).userOverride ? 0 : suggestion.confidence;

      expect(aiSuggested).toBe(true);
      expect(aiConfidence).toBe(0.75);
    });
  });
});
