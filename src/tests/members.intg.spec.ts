/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';

// 1. Mock auth middleware (MUST be before app import)
jest.mock('../shared/middlewares/auth/authHandler', () => {
  const { Types } = jest.requireActual('mongoose');
  const testUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'test@test.com',
    role: 'USER',
  };
  return {
    __esModule: true,
    default: {
      userAccess: jest.fn((req: any, _res: any, next: any) => {
        if (!req.get('accessToken')) {
          const { AuthError } = jest.requireActual('../shared/core/ApiError');
          return next(new AuthError('Please provide AccessToken!!'));
        }
        req.user = testUser;
        next();
      }),
      adminAccess: jest.fn((req: any, _res: any, next: any) => {
        req.user = testUser;
        next();
      }),
    },
  };
});

// 2. Mock mongoose session (asyncHandler starts a transaction on every request)
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connection: { readyState: 1, asPromise: jest.fn().mockResolvedValue(undefined) },
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    }),
  };
});

// 3. Mock the service layer
jest.mock('../modules/members/member.service');

import app from '../app';
import { MembersService } from '../modules/members/member.service';

const MockedService = MembersService as jest.MockedClass<typeof MembersService>;

describe('Members (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/members ──────────────────────────────────────

  describe('POST /api/v1/members', () => {
    it('should create a member and return 200 with output', async () => {
      const mockMember = { _id: 'm1', name: 'Alice', userId: '507f1f77bcf86cd799439011' };

      MockedService.prototype.createMember.mockResolvedValue(mockMember as any);

      const res = await request(app)
        .post('/api/v1/members')
        .set('accessToken', 'valid-token')
        .send({ name: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockMember);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).post('/api/v1/members').send({ name: 'Alice' });

        expect(res.status).toBe(401);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when name is empty', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.createMember.mockRejectedValue(
          new CustomError('Name is required', 400)
        );

        const res = await request(app)
          .post('/api/v1/members')
          .set('accessToken', 'valid-token')
          .send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Name is required');
      });

      it('should return 400 when member name already exists', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.createMember.mockRejectedValue(
          new CustomError('A member with this name already exists', 400)
        );

        const res = await request(app)
          .post('/api/v1/members')
          .set('accessToken', 'valid-token')
          .send({ name: 'Alice' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('A member with this name already exists');
      });
    });
  });

  // ─── GET /api/v1/members ─────────────────────────────────────────

  describe('GET /api/v1/members', () => {
    it('should return all members for the authenticated user', async () => {
      const mockMembers = [
        { _id: 'm1', name: 'Alice' },
        { _id: 'm2', name: 'Bob' },
      ];

      MockedService.prototype.listMembers.mockResolvedValue(mockMembers as any);

      const res = await request(app).get('/api/v1/members').set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockMembers);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).get('/api/v1/members');

        expect(res.status).toBe(401);
      });
    });
  });

  // ─── DELETE /api/v1/members/:id ────────────────────────────────

  describe('DELETE /api/v1/members/:id', () => {
    it('should delete a member and return success message', async () => {
      const mockResult = { message: 'Member deleted successfully' };

      MockedService.prototype.deleteMember.mockResolvedValue(mockResult as any);

      const res = await request(app)
        .delete('/api/v1/members/507f1f77bcf86cd799439011')
        .set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockResult);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).delete('/api/v1/members/507f1f77bcf86cd799439011');

        expect(res.status).toBe(401);
      });
    });

    describe('when member is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.deleteMember.mockRejectedValue(
          new CustomError('Member not found', 404)
        );

        const res = await request(app)
          .delete('/api/v1/members/507f1f77bcf86cd799439022')
          .set('accessToken', 'valid-token');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Member not found');
      });
    });
  });
});
