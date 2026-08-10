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

// Mock the CategorizationJob model for async job pattern
jest.mock('../models/categorization-job.model', () => {
  const mockJobDoc = {
    _id: { toString: () => 'mock-job-id' },
    userId: null,
    status: 'pending',
    totalTransactions: 0,
    processedTransactions: 0,
    suggestions: [],
    save: jest.fn(),
  };

  return {
    CategorizationJob: {
      findOne: jest.fn().mockResolvedValue(null), // No existing job (no deduplication block)
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...mockJobDoc,
        ...data,
        _id: { toString: () => 'mock-job-id' },
      })),
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    },
  };
});

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
    it('should return a jobId when starting categorization', async () => {
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

      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ transactionIds: [txId.toString()] });

      expect(res.status).toBe(200);
      expect(res.body.output).toHaveProperty('jobId');
      expect(res.body.output).toHaveProperty('status', 'pending');
      expect(res.body.output.progress).toEqual({ total: 1, processed: 0 });
    });

    it('should return existing jobId if a job is already in progress', async () => {
      const { CategorizationJob } = require('../models/categorization-job.model');
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
        hashMap: 'unique-hash-dedup',
      });

      // Mock an existing active job
      CategorizationJob.findOne.mockResolvedValueOnce({
        _id: { toString: () => 'existing-job-id' },
        status: 'processing',
        totalTransactions: 5,
        processedTransactions: 2,
      });

      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ transactionIds: [txId.toString()] });

      expect(res.status).toBe(200);
      expect(res.body.output.jobId).toBe('existing-job-id');
      expect(res.body.output.status).toBe('processing');
    });

    it('should return 400 without transactionIds or all', async () => {
      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return empty result when no transactions to categorize', async () => {
      const res = await request(app)
        .post('/api/v1/ai/suggest-categories')
        .set('accessToken', authToken)
        .send({ transactionIds: [new Types.ObjectId().toString()] });

      expect(res.status).toBe(200);
      expect(res.body.output.jobId).toBeNull();
      expect(res.body.output.status).toBe('completed');
      expect(res.body.output.suggestions).toEqual([]);
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
