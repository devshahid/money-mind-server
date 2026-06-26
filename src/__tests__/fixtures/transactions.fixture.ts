/**
 * Test Fixtures - Transactions
 * Sample transaction data for testing
 */

import { Types } from 'mongoose';

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

export const testTransactions = [
  {
    _id: new Types.ObjectId('600000000000000000000001'),
    userId,
    amount: 50.0,
    category: 'Food',
    description: 'Lunch at cafe',
    date: new Date('2024-01-15'),
    type: 'expense',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    _id: new Types.ObjectId('600000000000000000000002'),
    userId,
    amount: 120.0,
    category: 'Groceries',
    description: 'Weekly groceries',
    date: new Date('2024-01-16'),
    type: 'expense',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    _id: new Types.ObjectId('600000000000000000000003'),
    userId,
    amount: 30.0,
    category: 'Fuel',
    description: 'Gas station',
    date: new Date('2024-01-17'),
    type: 'expense',
    aiSuggested: true,
    aiConfidence: 0.95,
    aiConfirmed: false,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
];

export const testTransactionGroups = [
  {
    _id: new Types.ObjectId('610000000000000000000001'),
    userId,
    description: 'Team dinner',
    totalAmount: 150.0,
    paidBy: userId,
    date: new Date('2024-01-20'),
    splitType: 'equal',
    members: [
      {
        memberId: new Types.ObjectId('620000000000000000000001'),
        name: 'Alice',
        amount: 50.0,
      },
      {
        memberId: new Types.ObjectId('620000000000000000000002'),
        name: 'Bob',
        amount: 50.0,
      },
      {
        memberId: new Types.ObjectId('620000000000000000000003'),
        name: 'Charlie',
        amount: 50.0,
      },
    ],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
];

export const getTestTransaction = (index: number = 0) => testTransactions[index];
export const getTestTransactionGroup = (index: number = 0) => testTransactionGroups[index];
