/**
 * Unit Tests — Transaction Validation Schemas
 *
 * Tests the fetchTransactionsSchema to ensure:
 * - transactionType accepts 'online' and 'cash' (not 'credit'/'debit')
 * - type accepts 'credit' and 'debit'
 * - 'all' values are stripped / rejected
 * - default limit is 50
 * - pagination parameters work correctly
 * - keyword search parameter is accepted
 */

import { fetchTransactionsSchema } from './transaction.validation';

describe('fetchTransactionsSchema', () => {
  describe('transactionType field (online/cash filter)', () => {
    it('should accept "online" as a valid transactionType', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        transactionType: 'online',
      });
      expect(error).toBeUndefined();
      expect(value.transactionType).toBe('online');
    });

    it('should accept "cash" as a valid transactionType', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        transactionType: 'cash',
      });
      expect(error).toBeUndefined();
      expect(value.transactionType).toBe('cash');
    });

    it('should reject "credit" as transactionType', () => {
      const { error } = fetchTransactionsSchema.validate({
        transactionType: 'credit',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('transactionType');
    });

    it('should reject "debit" as transactionType', () => {
      const { error } = fetchTransactionsSchema.validate({
        transactionType: 'debit',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('transactionType');
    });

    it('should reject "all" as transactionType', () => {
      const { error } = fetchTransactionsSchema.validate({
        transactionType: 'all',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('transactionType');
    });

    it('should allow omitting transactionType entirely', () => {
      const { error, value } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.transactionType).toBeUndefined();
    });
  });

  describe('type field (credit/debit flow filter)', () => {
    it('should accept "credit" as a valid type', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        type: 'credit',
      });
      expect(error).toBeUndefined();
      expect(value.type).toBe('credit');
    });

    it('should accept "debit" as a valid type', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        type: 'debit',
      });
      expect(error).toBeUndefined();
      expect(value.type).toBe('debit');
    });

    it('should reject "all" as type', () => {
      const { error } = fetchTransactionsSchema.validate({
        type: 'all',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('type');
    });

    it('should reject "online" as type', () => {
      const { error } = fetchTransactionsSchema.validate({
        type: 'online',
      });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('type');
    });

    it('should allow omitting type entirely', () => {
      const { error, value } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.type).toBeUndefined();
    });
  });

  describe('pagination defaults', () => {
    it('should default page to 1 when not provided', () => {
      const { error, value } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
    });

    it('should default limit to 50 when not provided', () => {
      const { error, value } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.limit).toBe(50);
    });

    it('should accept custom page value', () => {
      const { error, value } = fetchTransactionsSchema.validate({ page: 3 });
      expect(error).toBeUndefined();
      expect(value.page).toBe(3);
    });

    it('should accept custom limit value', () => {
      const { error, value } = fetchTransactionsSchema.validate({ limit: 25 });
      expect(error).toBeUndefined();
      expect(value.limit).toBe(25);
    });

    it('should reject page less than 1', () => {
      const { error } = fetchTransactionsSchema.validate({ page: 0 });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('page');
    });

    it('should reject limit greater than 100', () => {
      const { error } = fetchTransactionsSchema.validate({ limit: 101 });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('limit');
    });

    it('should reject limit less than 1', () => {
      const { error } = fetchTransactionsSchema.validate({ limit: 0 });
      expect(error).toBeDefined();
      expect(error!.details[0].path).toContain('limit');
    });
  });

  describe('keyword search', () => {
    it('should accept a keyword string', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        keyword: 'grocery',
      });
      expect(error).toBeUndefined();
      expect(value.keyword).toBe('grocery');
    });

    it('should allow omitting keyword', () => {
      const { error, value } = fetchTransactionsSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.keyword).toBeUndefined();
    });
  });

  describe('combined filters', () => {
    it('should accept transactionType and type together', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        transactionType: 'online',
        type: 'credit',
      });
      expect(error).toBeUndefined();
      expect(value.transactionType).toBe('online');
      expect(value.type).toBe('credit');
    });

    it('should accept all valid filters together', () => {
      const { error, value } = fetchTransactionsSchema.validate({
        page: 2,
        limit: 25,
        transactionType: 'cash',
        type: 'debit',
        keyword: 'rent',
        bankName: 'HDFC',
        amount: 5000,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        labels: ['bills', 'recurring'],
        category: ['Food', 'Uncategorized'],
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(25);
      expect(value.transactionType).toBe('cash');
      expect(value.type).toBe('debit');
      expect(value.keyword).toBe('rent');
      expect(value.bankName).toBe('HDFC');
      expect(value.amount).toBe(5000);
      expect(value.labels).toEqual(['bills', 'recurring']);
      expect(value.category).toEqual(['Food', 'Uncategorized']);
    });

    it('should strip unknown fields', () => {
      const { error, value } = fetchTransactionsSchema.validate(
        { randomField: 'test', page: 1 },
        { stripUnknown: true }
      );
      expect(error).toBeUndefined();
      expect(value.randomField).toBeUndefined();
    });
  });

  describe('category validation', () => {
    it('should accept valid expense categories', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Food'],
      });
      expect(error).toBeUndefined();
    });

    it('should accept "Uncategorized" as a category', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['Uncategorized'],
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid category values', () => {
      const { error } = fetchTransactionsSchema.validate({
        category: ['InvalidCategory123'],
      });
      expect(error).toBeDefined();
    });
  });

  describe('date filters', () => {
    it('should accept valid date strings for dateFrom', () => {
      const { error } = fetchTransactionsSchema.validate({
        dateFrom: '2024-06-01',
      });
      expect(error).toBeUndefined();
    });

    it('should accept valid date strings for dateTo', () => {
      const { error } = fetchTransactionsSchema.validate({
        dateTo: '2024-12-31',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid date strings', () => {
      const { error } = fetchTransactionsSchema.validate({
        dateFrom: 'not-a-date',
      });
      expect(error).toBeDefined();
    });
  });
});
