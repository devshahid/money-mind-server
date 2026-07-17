/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * AI Suggest Categories - Integration Tests
 * Tests the full HTTP flow for suggest-categories and apply-suggestions endpoints
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
import { TransactionLogs } from '../../transactions/models/transaction-logs.model';
import jwtHandler from '../../../shared/core/jwtHandler';

// Mock the AI service to avoid hitting real LLM
jest.mock('../ai.service', () => ({
  __esModule: true,
  default: {
    categorizeTransactionsBatch: jest.fn().mockResolvedValue([]),
  },
}));

describe('AI Suggest Categories - Integration Tests', () => {
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
    jest.clearAllMocks();

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
  });

  describe('POST /api/v1/ai/suggest-categories', () => {
    it('should return suggestions with isCredit field', async () => {
      const aiService = require('../ai.service').default;
      const txId = new Types.ObjectId();

      await TransactionLogs.create({
        _id: txId,
        userId: testUserId,
        narration: 'SWIGGY ORDER',
        amount: 350,
        isCredit: false,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'unique-hash-1',
      });

      aiService.categorizeTransactionsBatch.mockResolvedValue([
        {
          transactionId: txId.toString(),
          category: 'Food',
          confidence: 0.95,
          reasoning: 'Food delivery',
        },
      ]);

      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ transactionIds: [txId.toString()] });

      expect(res.status).toBe(200);
      expect(res.body.output.suggestions).toHaveLength(1);
      expect(res.body.output.suggestions[0]).toHaveProperty('isCredit', false);
      expect(res.body.output.suggestions[0]).toHaveProperty('amount', 350);
      expect(res.body.output.suggestions[0]).toHaveProperty('suggestedCategory', 'Food');
    });

    it('should return isCredit=true for credit transactions', async () => {
      const aiService = require('../ai.service').default;
      const txId = new Types.ObjectId();

      await TransactionLogs.create({
        _id: txId,
        userId: testUserId,
        narration: 'SALARY CREDIT',
        amount: 50000,
        isCredit: true,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'unique-hash-2',
      });

      aiService.categorizeTransactionsBatch.mockResolvedValue([
        {
          transactionId: txId.toString(),
          category: 'Income',
          confidence: 0.98,
          reasoning: 'Salary credit',
        },
      ]);

      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ transactionIds: [txId.toString()] });

      expect(res.status).toBe(200);
      expect(res.body.output.suggestions[0].isCredit).toBe(true);
    });

    it('should return 400 without transactionIds or all', async () => {
      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should limit to 25 transactions per request', async () => {
      const aiService = require('../ai.service').default;
      const txIds: Types.ObjectId[] = [];

      // Create 30 uncategorized transactions
      for (let i = 0; i < 30; i++) {
        const txId = new Types.ObjectId();
        txIds.push(txId);
        await TransactionLogs.create({
          _id: txId,
          userId: testUserId,
          narration: `Transaction ${i}`,
          amount: 100 + i,
          isCredit: false,
          category: '',
          status: 'PENDING',
          transactionDate: new Date(),
          bankName: 'HDFC',
          hashMap: `unique-hash-${i}`,
        });
      }

      aiService.categorizeTransactionsBatch.mockResolvedValue(
        txIds.slice(0, 25).map((id) => ({
          transactionId: id.toString(),
          category: 'Other',
          confidence: 0.5,
          reasoning: 'Unknown',
        }))
      );

      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ all: true });

      expect(res.status).toBe(200);
      // Should be limited to 25
      expect(aiService.categorizeTransactionsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ narration: expect.any(String) })])
      );
      const callArg = aiService.categorizeTransactionsBatch.mock.calls[0][0];
      expect(callArg.length).toBeLessThanOrEqual(25);
    });
  });

  describe('POST /api/v1/ai/apply-suggestions', () => {
    it('should set aiSuggested=false when userOverride=true', async () => {
      const txId = new Types.ObjectId();

      await TransactionLogs.create({
        _id: txId,
        userId: testUserId,
        narration: 'Test transaction',
        amount: 100,
        isCredit: false,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'unique-hash-apply-1',
      });

      const res = await request(app)
        .post('/api/v1/ai/apply-suggestions')
        .set('accessToken', authToken)
        .send({
          suggestions: [
            {
              transactionId: txId.toString(),
              category: 'Food',
              confidence: 1,
              userOverride: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.output.applied).toBe(1);

      // Verify DB state
      const updated = await TransactionLogs.findById(txId);
      expect(updated!.category).toBe('Food');
      expect(updated!.aiSuggested).toBe(false);
      expect(updated!.aiConfidence).toBe(0);
      expect(updated!.aiConfirmed).toBe(true);
    });

    it('should set aiSuggested=true when userOverride is absent', async () => {
      const txId = new Types.ObjectId();

      await TransactionLogs.create({
        _id: txId,
        userId: testUserId,
        narration: 'Petrol pump',
        amount: 2000,
        isCredit: false,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'unique-hash-apply-2',
      });

      const res = await request(app)
        .post('/api/v1/ai/apply-suggestions')
        .set('accessToken', authToken)
        .send({
          suggestions: [
            {
              transactionId: txId.toString(),
              category: 'Fuel',
              confidence: 0.92,
            },
          ],
        });

      expect(res.status).toBe(200);

      const updated = await TransactionLogs.findById(txId);
      expect(updated!.category).toBe('Fuel');
      expect(updated!.aiSuggested).toBe(true);
      expect(updated!.aiConfidence).toBe(0.92);
    });

    it('should accept Refunds & Reversals category', async () => {
      const txId = new Types.ObjectId();

      await TransactionLogs.create({
        _id: txId,
        userId: testUserId,
        narration: 'IRCTC REFUND',
        amount: 500,
        isCredit: true,
        category: '',
        status: 'PENDING',
        transactionDate: new Date(),
        bankName: 'HDFC',
        hashMap: 'unique-hash-apply-3',
      });

      const res = await request(app)
        .post('/api/v1/ai/apply-suggestions')
        .set('accessToken', authToken)
        .send({
          suggestions: [
            {
              transactionId: txId.toString(),
              category: 'Refunds & Reversals',
              confidence: 0.9,
              userOverride: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      const updated = await TransactionLogs.findById(txId);
      expect(updated!.category).toBe('Refunds & Reversals');
    });

    it('should reject invalid category', async () => {
      const res = await request(app)
        .post('/api/v1/ai/apply-suggestions')
        .set('accessToken', authToken)
        .send({
          suggestions: [
            {
              transactionId: new Types.ObjectId().toString(),
              category: 'InvalidCategory',
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });
});
