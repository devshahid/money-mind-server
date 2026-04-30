/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';

// 1. Mock auth middleware (MUST be before app import)
jest.mock('../middlewares/auth/authHandler', () => {
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
          const { AuthError } = jest.requireActual('../core/ApiError');
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
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    }),
  };
});

// 3. Mock the service layer
jest.mock('../services/members.service');

import app from '../app';
import { MembersService } from '../modules/members/member.service';

const MockedService = MembersService as jest.MockedClass<typeof MembersService>;

describe('Members (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/members/create ──────────────────────────────────────

  describe('POST /api/v1/members/create', () => {
    it('should create a member and return 200 with output', async () => {
      const mockMember = { _id: 'm1', name: 'Alice', userId: '507f1f77bcf86cd799439011' };

      MockedService.prototype.createMember.mockResolvedValue(mockMember as any);

      const res = await request(app)
        .post('/api/v1/members/create')
        .set('accessToken', 'valid-token')
        .send({ name: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockMember);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).post('/api/v1/members/create').send({ name: 'Alice' });

        expect(res.status).toBe(401);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when name is empty', async () => {
        const { CustomError } = jest.requireActual('../core/ApiError');
        MockedService.prototype.createMember.mockRejectedValue(
          new CustomError('Member name is required', 400)
        );

        const res = await request(app)
          .post('/api/v1/members/create')
          .set('accessToken', 'valid-token')
          .send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Member name is required');
      });

      it('should return 400 when member name already exists', async () => {
        const { CustomError } = jest.requireActual('../core/ApiError');
        MockedService.prototype.createMember.mockRejectedValue(
          new CustomError('A member with this name already exists', 400)
        );

        const res = await request(app)
          .post('/api/v1/members/create')
          .set('accessToken', 'valid-token')
          .send({ name: 'Alice' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('A member with this name already exists');
      });
    });
  });

  // ─── GET /api/v1/members/list ─────────────────────────────────────────

  describe('GET /api/v1/members/list', () => {
    it('should return all members for the authenticated user', async () => {
      const mockMembers = [
        { _id: 'm1', name: 'Alice' },
        { _id: 'm2', name: 'Bob' },
      ];

      MockedService.prototype.listMembers.mockResolvedValue(mockMembers as any);

      const res = await request(app).get('/api/v1/members/list').set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockMembers);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).get('/api/v1/members/list');

        expect(res.status).toBe(401);
      });
    });
  });

  // ─── DELETE /api/v1/members/delete/:id ────────────────────────────────

  describe('DELETE /api/v1/members/delete/:id', () => {
    it('should delete a member and return success message', async () => {
      const mockResult = { message: 'Member deleted successfully' };

      MockedService.prototype.deleteMember.mockResolvedValue(mockResult as any);

      const res = await request(app)
        .delete('/api/v1/members/delete/m1')
        .set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockResult);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).delete('/api/v1/members/delete/m1');

        expect(res.status).toBe(401);
      });
    });

    describe('when member is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../core/ApiError');
        MockedService.prototype.deleteMember.mockRejectedValue(
          new CustomError('Member not found', 404)
        );

        const res = await request(app)
          .delete('/api/v1/members/delete/nonexistent')
          .set('accessToken', 'valid-token');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Member not found');
      });
    });
  });
});
