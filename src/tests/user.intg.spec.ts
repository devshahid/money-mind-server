import request from 'supertest';

// Mock mongoose session (asyncHandler starts a transaction on every request)
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    }),
  };
});

import app from '../app';

describe('App Health Check (Integration)', () => {
  describe('GET /health', () => {
    it('should return 200 with server running message', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Server is running');
    });
  });

  describe('GET /nonexistent-route', () => {
    it('should return 500 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route');

      expect(res.status).toBe(500);
    });
  });
});
