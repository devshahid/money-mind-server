/**
 * Shared constants across the application
 * Centralized category definitions synced with frontend
 */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Fruits',
  'Vegetables',
  'Groceries',
  'Fuel',
  'Travel',
  'Medical',
  'Entertainment',
  'Shopping',
  'Bills & Utilities',
  'Vehical Servicing',
  'Maintenance & Repairs',
  'Education',
  'EMI',
  'Rent',
  'Family',
  'Personal',
  'Recharge (Mobile, Fibre, TV..)',
  'Subscriptions',
  'Memberships (Gym, Club..)',
  'Income',
  'Lending',
  'Borrowed',
  'Insurance',
  'Taxes',
  'Salon & Spa Services',
  'Gifts & Donations',
  'Laundry & Dry Cleaning',
  'Cosmetics & Makeup',
  'Pet Care',
  'Purchase',
  'Payments',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Validate if a string is a valid category
 * @param category - String to validate
 * @returns True if valid category
 */
export function isValidCategory(category: string): category is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
}

/**
 * Get all expense categories
 * @returns Array of all categories
 */
export function getExpenseCategories(): readonly string[] {
  return EXPENSE_CATEGORIES;
}
