/**
 * Test Fixtures - Debts
 * Sample debt data for testing
 */

import { Types } from 'mongoose';

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

export const testDebts = [
  {
    _id: new Types.ObjectId('630000000000000000000001'),
    userId,
    creditorName: 'Credit Card Company',
    principalAmount: 5000.0,
    interestRate: 18.0,
    minimumPayment: 150.0,
    dueDate: new Date('2024-02-15'),
    status: 'active',
    remainingBalance: 4500.0,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: new Types.ObjectId('630000000000000000000002'),
    userId,
    creditorName: 'Student Loan',
    principalAmount: 20000.0,
    interestRate: 6.5,
    minimumPayment: 300.0,
    dueDate: new Date('2024-02-01'),
    status: 'active',
    remainingBalance: 18000.0,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const testDebtPayments = [
  {
    _id: new Types.ObjectId('640000000000000000000001'),
    debtId: new Types.ObjectId('630000000000000000000001'),
    amount: 500.0,
    paymentDate: new Date('2024-01-15'),
    principalPaid: 410.0,
    interestPaid: 90.0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const getTestDebt = (index: number = 0) => testDebts[index];
export const getTestDebtPayment = (index: number = 0) => testDebtPayments[index];
