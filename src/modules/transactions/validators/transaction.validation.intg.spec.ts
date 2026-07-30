/**
 * Integration Tests — Transaction Filter Validation Middleware
 *
 * Tests the validateRequest middleware function with fetchTransactionsSchema:
 * - Verifies that valid requests pass through to next()
 * - Verifies that invalid requests return 400 with error details
 * - Tests the full middleware contract (req/res/next pattern)
 */

/// <reference types="jest" />

/* eslint-disable @typescript-eslint/no-explicit-any */

import { validateRequest, fetchTransactionsSchema } from './transaction.validation';

describe('validateRequest middleware with fetchTransactionsSchema', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let middleware: any;

  beforeEach(() => {
    middleware = validateRequest(fetchTransactionsSchema, 'body');
    mockNext = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnValue({
        json: jest.fn(),
      }),
    };
  });

  const createReq = (body: object) => ({
    body,
    query: {},
    params: {},
  });

  describe('valid requests — calls next()', () => {
    it('should pass with transactionType "online"', () => {
      mockReq = createReq({ transactionType: 'online' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass with transactionType "cash"', () => {
      mockReq = createReq({ transactionType: 'cash' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass with type "credit"', () => {
      mockReq = createReq({ type: 'credit' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with type "debit"', () => {
      mockReq = createReq({ type: 'debit' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with keyword search and pagination', () => {
      mockReq = createReq({ keyword: 'grocery', page: 2, limit: 50 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with combined online + credit filters', () => {
      mockReq = createReq({ transactionType: 'online', type: 'credit' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with empty body (uses defaults)', () => {
      mockReq = createReq({});
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // Verify defaults are applied
      expect(mockReq.body.page).toBe(1);
      expect(mockReq.body.limit).toBe(50);
    });

    it('should pass with full valid filter set', () => {
      mockReq = createReq({
        transactionType: 'cash',
        type: 'debit',
        keyword: 'salary',
        bankName: 'HDFC',
        page: 2,
        limit: 25,
        category: ['Food'],
        labels: ['bills'],
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        amount: 5000,
      });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('invalid requests — returns 400', () => {
    it('should reject transactionType "credit" (belongs to type field)', () => {
      mockReq = createReq({ transactionType: 'credit' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.status(400).json;
      expect(jsonCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Validation error',
          errors: expect.arrayContaining([expect.objectContaining({ field: 'transactionType' })]),
        })
      );
    });

    it('should reject transactionType "debit" (belongs to type field)', () => {
      mockReq = createReq({ transactionType: 'debit' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject transactionType "all" (should be stripped by client)', () => {
      mockReq = createReq({ transactionType: 'all' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject type "all" (should be stripped by client)', () => {
      mockReq = createReq({ type: 'all' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject type "online" (belongs to transactionType field)', () => {
      mockReq = createReq({ type: 'online' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject type "cash" (belongs to transactionType field)', () => {
      mockReq = createReq({ type: 'cash' });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject limit above 100', () => {
      mockReq = createReq({ limit: 200 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject page less than 1', () => {
      mockReq = createReq({ page: 0 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid category', () => {
      mockReq = createReq({ category: ['InvalidCategory'] });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('stripUnknown behavior', () => {
    it('should strip unknown fields from request body', () => {
      mockReq = createReq({ unknownField: 'test', page: 2 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.unknownField).toBeUndefined();
      expect(mockReq.body.page).toBe(2);
    });
  });

  describe('default values applied to req.body', () => {
    it('should set page=1 and limit=50 when not provided', () => {
      mockReq = createReq({});
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.page).toBe(1);
      expect(mockReq.body.limit).toBe(50);
    });

    it('should not override page when provided', () => {
      mockReq = createReq({ page: 3 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.page).toBe(3);
    });

    it('should not override limit when provided', () => {
      mockReq = createReq({ limit: 25 });
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.limit).toBe(25);
    });
  });
});
