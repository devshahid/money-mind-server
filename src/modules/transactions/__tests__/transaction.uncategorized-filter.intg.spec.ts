/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Transaction Uncategorized Filter - Integration Tests
 * Tests the full HTTP flow for list-transactions with Uncategorized category filter
 */

import request from 'supertest';
import { Express } from 'express';
import { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../__tests__/helpers/database.helper';
import { User } from '../../users/models/user.model';
import { UserLogin } from '../../users/models/user-logins.model';
import { TransactionLogs } from '../models/transaction-logs.model';
import jwtHandler from '../../../shared/core/jwtHandler';

describe('Transaction Uncategorized Filter - Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: Types.ObjectId;

  beforeAll(async () => {
    await connectTestDatabase();
    const appModule = await import('../../../app');
    app = appModule.default;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    const testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'USER',
    });
    testUserId = testUser._id;

    authToken = jwtHandler.createJwtToken({
      email: testUser.email,
      userId: testUser._id,
      userType: 'USER',
    });

    await UserLogin.create({
      userId: testUser._id,
      email: testUser.email,
      accessToken: authToken,
    });

    // Create test transactions with various category states
    await TransactionLogs.insertMany([
      {
        userId: testUserId,
        narration: 'SWIGGY ORDER',
        amount: 350,
        isCredit: false,
        category: 'Food',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'hash-1',
      },
      {
        userId: testUserId,
        narration: 'UNKNOWN PAYMENT',
        amount: 100,
        isCredit: false,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'hash-2',
      },
      {
        userId: testUserId,
        narration: 'RANDOM TRANSFER',
        amount: 200,
        isCredit: false,
        category: null,
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'hash-3',
      },
      {
        userId: testUserId,
        narration: 'OLD TRANSACTION',
        amount: 500,
        isCredit: false,
        category: 'Others',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'hash-4',
      },
      {
        userId: testUserId,
        narration: 'PETROL PUMP',
        amount: 2000,
        isCredit: false,
        category: 'Fuel',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'hash-5',
      },
    ]);
  });

  describe('POST /api/v1/transaction-logs/list-transactions', () => {
    it('should filter only uncategorized transactions', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ category: ['Uncategorized'], page: 1, limit: 50 });

      expect(res.status).toBe(200);
      const transactions = res.body.output.result;

      // Should return transactions with empty, null, or 'Others' category
      expect(transactions.length).toBe(3);
      transactions.forEach((tx: any) => {
        expect([null, '', 'Others']).toContain(tx.category || null);
      });
    });

    it('should filter Uncategorized combined with Food', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ category: ['Uncategorized', 'Food'], page: 1, limit: 50 });

      expect(res.status).toBe(200);
      const transactions = res.body.output.result;

      // Should return 3 uncategorized + 1 Food = 4
      expect(transactions.length).toBe(4);
    });

    it('should filter only Food category (no uncategorized)', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ category: ['Food'], page: 1, limit: 50 });

      expect(res.status).toBe(200);
      const transactions = res.body.output.result;

      expect(transactions.length).toBe(1);
      expect(transactions[0].category).toBe('Food');
    });

    it('should return all transactions without category filter', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ page: 1, limit: 50 });

      expect(res.status).toBe(200);
      const transactions = res.body.output.result;
      expect(transactions.length).toBe(5);
    });

    it('should reject invalid category in filter', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ category: ['InvalidCategory'], page: 1, limit: 50 });

      expect(res.status).toBe(400);
    });

    it('should accept Refunds & Reversals in category filter', async () => {
      const res = await request(app)
        .post('/api/v1/transaction-logs/list-transactions')
        .set('accessToken', authToken)
        .send({ category: ['Refunds & Reversals'], page: 1, limit: 50 });

      expect(res.status).toBe(200);
      // No transactions with this category exist, so empty
      expect(res.body.output.result.length).toBe(0);
    });
  });
});
