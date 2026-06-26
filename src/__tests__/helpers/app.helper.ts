/**
 * App Test Helper
 * Initialize Express app for testing
 */

/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */

import { Express } from 'express';
import { Types } from 'mongoose';

/**
 * Initialize Express app for testing
 * Uses the actual app configuration
 */
export const initApp = async (): Promise<Express> => {
  const app = (await import('../../app')).default;
  return app;
};

/**
 * Generate mock user for testing
 */
export const createMockUser = (overrides?: {
  id?: string;
  email?: string;
  role?: string;
}): { _id: Types.ObjectId; email: string; role: string } => {
  return {
    _id: new Types.ObjectId(overrides?.id || '507f1f77bcf86cd799439011'),
    email: overrides?.email || 'test@example.com',
    role: overrides?.role || 'USER',
  };
};

/**
 * Mock authentication middleware for testing
 * Automatically adds a test user to requests
 */
export const mockAuthMiddleware = () => {
  const testUser = createMockUser();

  return {
    userAccess: jest.fn((req: any, _res: any, next: any) => {
      if (!req.get('accessToken')) {
        const { AuthError } = jest.requireActual('../../shared/core/ApiError');
        return next(new AuthError('Please provide AccessToken!!'));
      }
      req.user = testUser;
      next();
    }),
    adminAccess: jest.fn((req: any, _res: any, next: any) => {
      req.user = testUser;
      next();
    }),
  };
};

/**
 * Mock mongoose session for testing
 * Prevents actual database transactions in tests
 */
export const mockMongooseSession = () => {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
};

/**
 * Setup common mocks for integration tests
 */
export const setupIntegrationTestMocks = (): void => {
  // Mock auth middleware
  jest.mock('../../shared/middlewares/auth/authHandler', () => ({
    __esModule: true,
    default: mockAuthMiddleware(),
  }));

  // Mock mongoose session
  jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
      ...actual,
      startSession: jest.fn().mockResolvedValue(mockMongooseSession()),
    };
  });
};
