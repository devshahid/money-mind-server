/// <reference types="jest" />

/**
 * Transaction Validation Schema Tests
 * Tests for: fetchTransactionsSchema with category array and Uncategorized
 */

import { fetchTransactionsSchema } from '../validators/transaction.validation';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

describe('Transaction Validation Schemas', () => {
  describe('fetchTransactionsSchema - category filter', () => {
    it('should validate category as an array of valid categories', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Food', 'Fuel', 'Travel'],
      });
      expect(error).toBeUndefined();
    });

    it('should validate Uncategorized as a valid category option', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Uncategorized'],
      });
      expect(error).toBeUndefined();
    });

    it('should validate Uncategorized combined with other categories', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Uncategorized', 'Food', 'Shopping'],
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid category in array', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Food', 'NonExistentCategory'],
      });
      expect(error).toBeDefined();
    });

    it('should accept Refunds & Reversals in category filter', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Refunds & Reversals'],
      });
      expect(error).toBeUndefined();
    });

    it('should accept all EXPENSE_CATEGORIES individually', () => {
      EXPENSE_CATEGORIES.forEach((cat) => {
        const { error } = fetchTransactionsSchema.validate({
          category: [cat],
        });
        expect(error).toBeUndefined();
      });
    });

    it('should accept empty request (no filters)', () => {
      const { error } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should validate with all filter fields together', () => {
      const { error } = fetchTransactionsSchema.validate({
        page: 1,
        limit: 50,
        category: ['Uncategorized', 'Food'],
        bankName: 'HDFC',
        type: 'debit',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });
      expect(error).toBeUndefined();
    });

    it('should reject category as a string (must be array)', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: 'Food',
      });
      expect(error).toBeDefined();
    });
  });
});
