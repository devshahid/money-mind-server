/// <reference types="jest" />

/**
 * AI Validation Schema Tests
 * Tests for: apply-suggestions schema with userOverride, suggest-categories schema
 */

import { applySuggestionsSchema, suggestCategoriesSchema } from '../validators/ai.validation';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

describe('AI Validation Schemas', () => {
  describe('suggestCategoriesSchema', () => {
    it('should validate with transactionIds', () => {
      const { error } = suggestCategoriesSchema.validate({
        transactionIds: ['id1', 'id2'],
      });
      expect(error).toBeUndefined();
    });

    it('should validate with all=true', () => {
      const { error } = suggestCategoriesSchema.validate({ all: true });
      expect(error).toBeUndefined();
    });

    it('should fail without transactionIds or all', () => {
      const { error } = suggestCategoriesSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe('applySuggestionsSchema', () => {
    it('should validate valid suggestion with category', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Food' }],
      });
      expect(error).toBeUndefined();
    });

    it('should validate suggestion with userOverride=true', () => {
      const { error, value } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Food', userOverride: true }],
      });
      expect(error).toBeUndefined();
      expect(value.suggestions[0].userOverride).toBe(true);
    });

    it('should validate suggestion with userOverride=false', () => {
      const { error, value } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Fuel', userOverride: false }],
      });
      expect(error).toBeUndefined();
      expect(value.suggestions[0].userOverride).toBe(false);
    });

    it('should validate suggestion without userOverride (optional)', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Travel' }],
      });
      expect(error).toBeUndefined();
    });

    it('should validate suggestion with confidence', () => {
      const { error, value } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Food', confidence: 0.95 }],
      });
      expect(error).toBeUndefined();
      expect(value.suggestions[0].confidence).toBe(0.95);
    });

    it('should reject invalid category', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'InvalidCategory' }],
      });
      expect(error).toBeDefined();
    });

    it('should reject empty suggestions array', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [],
      });
      expect(error).toBeDefined();
    });

    it('should reject missing transactionId', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ category: 'Food' }],
      });
      expect(error).toBeDefined();
    });

    it('should reject missing category', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1' }],
      });
      expect(error).toBeDefined();
    });

    it('should accept Refunds & Reversals category', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [{ transactionId: 'tx1', category: 'Refunds & Reversals' }],
      });
      expect(error).toBeUndefined();
    });

    it('should accept all valid EXPENSE_CATEGORIES', () => {
      EXPENSE_CATEGORIES.forEach((cat) => {
        const { error } = applySuggestionsSchema.validate({
          suggestions: [{ transactionId: 'tx1', category: cat }],
        });
        expect(error).toBeUndefined();
      });
    });

    it('should validate multiple suggestions', () => {
      const { error } = applySuggestionsSchema.validate({
        suggestions: [
          { transactionId: 'tx1', category: 'Food', userOverride: true },
          { transactionId: 'tx2', category: 'Fuel', userOverride: false },
          { transactionId: 'tx3', category: 'Income', confidence: 0.9 },
        ],
      });
      expect(error).toBeUndefined();
    });
  });
});
