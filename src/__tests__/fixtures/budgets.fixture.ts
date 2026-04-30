/**
 * Test Fixtures - Budgets
 * Sample budget data for testing
 */

import { Types } from 'mongoose';

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

export const testBudgets = [
  {
    _id: new Types.ObjectId('650000000000000000000001'),
    userId,
    month: 1,
    year: 2024,
    totalBudget: 2000.0,
    categories: [
      {
        category: 'Food',
        budgetAmount: 500.0,
        spentAmount: 350.0,
      },
      {
        category: 'Groceries',
        budgetAmount: 400.0,
        spentAmount: 380.0,
      },
      {
        category: 'Fuel',
        budgetAmount: 200.0,
        spentAmount: 150.0,
      },
      {
        category: 'Entertainment',
        budgetAmount: 300.0,
        spentAmount: 250.0,
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    _id: new Types.ObjectId('650000000000000000000002'),
    userId,
    month: 2,
    year: 2024,
    totalBudget: 2200.0,
    categories: [
      {
        category: 'Food',
        budgetAmount: 550.0,
        spentAmount: 0.0,
      },
      {
        category: 'Groceries',
        budgetAmount: 450.0,
        spentAmount: 0.0,
      },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

export const getTestBudget = (index: number = 0) => testBudgets[index];
