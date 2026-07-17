/// <reference types="jest" />

/**
 * Categories Constants Tests
 * Tests for: Refunds & Reversals category, isValidCategory helper
 */

import { EXPENSE_CATEGORIES, isValidCategory, getExpenseCategories } from '../constants';

describe('EXPENSE_CATEGORIES', () => {
  it('should include Refunds & Reversals', () => {
    expect(EXPENSE_CATEGORIES).toContain('Refunds & Reversals');
  });

  it('should include all standard categories', () => {
    const expectedCategories = [
      'Food',
      'Groceries',
      'Fuel',
      'Travel',
      'Medical',
      'Entertainment',
      'Shopping',
      'Bills & Utilities',
      'EMI',
      'Rent',
      'Income',
      'Payments',
      'Other',
    ];

    expectedCategories.forEach((cat) => {
      expect(EXPENSE_CATEGORIES).toContain(cat);
    });
  });

  it('should not include Uncategorized (it is a filter-only option)', () => {
    expect(EXPENSE_CATEGORIES).not.toContain('Uncategorized');
  });
});

describe('isValidCategory', () => {
  it('should return true for Refunds & Reversals', () => {
    expect(isValidCategory('Refunds & Reversals')).toBe(true);
  });

  it('should return true for all EXPENSE_CATEGORIES', () => {
    EXPENSE_CATEGORIES.forEach((cat) => {
      expect(isValidCategory(cat)).toBe(true);
    });
  });

  it('should return false for invalid categories', () => {
    expect(isValidCategory('InvalidCategory')).toBe(false);
    expect(isValidCategory('')).toBe(false);
    expect(isValidCategory('Uncategorized')).toBe(false);
  });
});

describe('getExpenseCategories', () => {
  it('should return all categories as readonly array', () => {
    const categories = getExpenseCategories();
    expect(categories.length).toBe(EXPENSE_CATEGORIES.length);
    expect(categories).toContain('Refunds & Reversals');
  });
});
