/**
 * Test Fixtures - Goals
 * Sample financial goals data for testing
 */

import { Types } from 'mongoose';

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

export const testGoals = [
  {
    _id: new Types.ObjectId('660000000000000000000001'),
    userId,
    name: 'Emergency Fund',
    targetAmount: 10000.0,
    currentAmount: 3500.0,
    deadline: new Date('2024-12-31'),
    category: 'Savings',
    status: 'in-progress',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    _id: new Types.ObjectId('660000000000000000000002'),
    userId,
    name: 'New Laptop',
    targetAmount: 1500.0,
    currentAmount: 800.0,
    deadline: new Date('2024-06-30'),
    category: 'Purchase',
    status: 'in-progress',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    _id: new Types.ObjectId('660000000000000000000003'),
    userId,
    name: 'Vacation',
    targetAmount: 2000.0,
    currentAmount: 2000.0,
    deadline: new Date('2024-03-31'),
    category: 'Travel',
    status: 'completed',
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const getTestGoal = (index: number = 0) => testGoals[index];
