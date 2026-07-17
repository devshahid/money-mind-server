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
jest.mock('../modules/transactions/transaction-groups.service');

import app from '../app';
import { TransactionGroupsService } from '../modules/transactions/transaction-groups.service';

const MockedService = TransactionGroupsService as jest.MockedClass<typeof TransactionGroupsService>;

describe('Transaction Groups (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/transaction-groups/create ───────────────────────────

  describe('POST /api/v1/transaction-groups/create', () => {
    it('should create a group and return 200 with output', async () => {
      const mockGroup = { _id: 'abc123', name: 'Trip', clientId: 'uuid-1' };
      MockedService.prototype.createGroup.mockResolvedValue(mockGroup as any);

      const res = await request(app)
        .post('/api/v1/transaction-groups/create')
        .set('accessToken', 'valid-token')
        .send({ clientId: 'uuid-1', name: 'Trip' });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroup);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app)
          .post('/api/v1/transaction-groups/create')
          .send({ clientId: 'uuid-1', name: 'Trip' });

        expect(res.status).toBe(401);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when name is empty', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.createGroup.mockRejectedValue(
          new CustomError('Group name is required', 400)
        );

        const res = await request(app)
          .post('/api/v1/transaction-groups/create')
          .set('accessToken', 'valid-token')
          .send({ clientId: 'uuid-1', name: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Group name is required');
      });

      it('should return 400 when clientId is missing', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.createGroup.mockRejectedValue(
          new CustomError('clientId is required', 400)
        );

        const res = await request(app)
          .post('/api/v1/transaction-groups/create')
          .set('accessToken', 'valid-token')
          .send({ name: 'Trip' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('clientId is required');
      });
    });
  });

  // ─── GET /api/v1/transaction-groups/list ───────────────────────────────

  describe('GET /api/v1/transaction-groups/list', () => {
    it('should return all groups for the authenticated user', async () => {
      const mockGroups = [
        { _id: 'g1', name: 'Trip', clientId: 'uuid-1' },
        { _id: 'g2', name: 'Rent', clientId: 'uuid-2' },
      ];
      MockedService.prototype.listGroups.mockResolvedValue(mockGroups as any);

      const res = await request(app)
        .get('/api/v1/transaction-groups/list')
        .set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroups);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).get('/api/v1/transaction-groups/list');

        expect(res.status).toBe(401);
      });
    });
  });

  // ─── GET /api/v1/transaction-groups/:id ────────────────────────────────

  describe('GET /api/v1/transaction-groups/:id', () => {
    it('should return a single group by id', async () => {
      const mockGroup = { _id: 'g1', name: 'Trip', clientId: 'uuid-1' };
      MockedService.prototype.getGroup.mockResolvedValue(mockGroup as any);

      const res = await request(app)
        .get('/api/v1/transaction-groups/g1')
        .set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroup);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).get('/api/v1/transaction-groups/g1');

        expect(res.status).toBe(401);
      });
    });

    describe('when group is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.getGroup.mockRejectedValue(new CustomError('Group not found', 404));

        const res = await request(app)
          .get('/api/v1/transaction-groups/nonexistent')
          .set('accessToken', 'valid-token');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Group not found');
      });
    });
  });

  // ─── PUT /api/v1/transaction-groups/update/:id ─────────────────────────

  describe('PUT /api/v1/transaction-groups/update/:id', () => {
    it('should update a group and return the updated group', async () => {
      const mockGroup = { _id: 'g1', name: 'Updated Trip', clientId: 'uuid-1' };
      MockedService.prototype.updateGroup.mockResolvedValue(mockGroup as any);

      const res = await request(app)
        .put('/api/v1/transaction-groups/update/g1')
        .set('accessToken', 'valid-token')
        .send({ name: 'Updated Trip' });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroup);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app)
          .put('/api/v1/transaction-groups/update/g1')
          .send({ name: 'Updated Trip' });

        expect(res.status).toBe(401);
      });
    });

    describe('when group is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.updateGroup.mockRejectedValue(
          new CustomError('Group not found', 404)
        );

        const res = await request(app)
          .put('/api/v1/transaction-groups/update/nonexistent')
          .set('accessToken', 'valid-token')
          .send({ name: 'Updated' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Group not found');
      });
    });

    describe('when validation fails', () => {
      it('should return 400 for invalid splitType', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.updateGroup.mockRejectedValue(
          new CustomError(
            'Invalid splitType. Must be one of: EQUAL_INCLUDE_PAYER, EQUAL_EXCLUDE_PAYER, CUSTOM_AMOUNTS, PERCENTAGE_SPLIT, LOAN, ITEMIZED',
            400
          )
        );

        const res = await request(app)
          .put('/api/v1/transaction-groups/update/g1')
          .set('accessToken', 'valid-token')
          .send({ splitType: 'INVALID' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Invalid splitType');
      });
    });
  });

  // ─── DELETE /api/v1/transaction-groups/delete/:id ──────────────────────

  describe('DELETE /api/v1/transaction-groups/delete/:id', () => {
    it('should delete a group and return success message', async () => {
      const mockResult = { message: 'Group deleted successfully' };
      MockedService.prototype.deleteGroup.mockResolvedValue(mockResult as any);

      const res = await request(app)
        .delete('/api/v1/transaction-groups/delete/g1')
        .set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockResult);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).delete('/api/v1/transaction-groups/delete/g1');

        expect(res.status).toBe(401);
      });
    });

    describe('when group is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.deleteGroup.mockRejectedValue(
          new CustomError('Group not found', 404)
        );

        const res = await request(app)
          .delete('/api/v1/transaction-groups/delete/nonexistent')
          .set('accessToken', 'valid-token');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Group not found');
      });
    });
  });

  // ─── PUT /api/v1/transaction-groups/:id/add-transactions ───────────────

  describe('PUT /api/v1/transaction-groups/:id/add-transactions', () => {
    it('should add transactions and return the updated group', async () => {
      const mockGroup = {
        _id: 'g1',
        name: 'Trip',
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
      };
      MockedService.prototype.addTransactions.mockResolvedValue(mockGroup as any);

      const res = await request(app)
        .put('/api/v1/transaction-groups/g1/add-transactions')
        .set('accessToken', 'valid-token')
        .send({ transactionIds: ['tx-2', 'tx-3'] });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroup);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app)
          .put('/api/v1/transaction-groups/g1/add-transactions')
          .send({ transactionIds: ['tx-2'] });

        expect(res.status).toBe(401);
      });
    });

    describe('when group is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.addTransactions.mockRejectedValue(
          new CustomError('Group not found', 404)
        );

        const res = await request(app)
          .put('/api/v1/transaction-groups/nonexistent/add-transactions')
          .set('accessToken', 'valid-token')
          .send({ transactionIds: ['tx-1'] });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Group not found');
      });
    });
  });

  // ─── PUT /api/v1/transaction-groups/:id/remove-transaction ─────────────

  describe('PUT /api/v1/transaction-groups/:id/remove-transaction', () => {
    it('should remove a transaction and return the updated group', async () => {
      const mockGroup = {
        _id: 'g1',
        name: 'Trip',
        transactionIds: ['tx-1'],
      };
      MockedService.prototype.removeTransaction.mockResolvedValue(mockGroup as any);

      const res = await request(app)
        .put('/api/v1/transaction-groups/g1/remove-transaction')
        .set('accessToken', 'valid-token')
        .send({ transactionId: 'tx-2' });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockGroup);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app)
          .put('/api/v1/transaction-groups/g1/remove-transaction')
          .send({ transactionId: 'tx-2' });

        expect(res.status).toBe(401);
      });
    });

    describe('when group is not found', () => {
      it('should return 404', async () => {
        const { CustomError } = jest.requireActual('../shared/core/ApiError');
        MockedService.prototype.removeTransaction.mockRejectedValue(
          new CustomError('Group not found', 404)
        );

        const res = await request(app)
          .put('/api/v1/transaction-groups/nonexistent/remove-transaction')
          .set('accessToken', 'valid-token')
          .send({ transactionId: 'tx-1' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Group not found');
      });
    });
  });

  // ─── PUT /api/v1/transaction-groups/sync ───────────────────────────────

  describe('PUT /api/v1/transaction-groups/sync', () => {
    it('should sync groups and return sync stats', async () => {
      const mockResult = {
        synced: 2,
        created: 1,
        updated: 1,
        deleted: 0,
        groups: [
          { _id: 'g1', name: 'Trip', clientId: 'uuid-1' },
          { _id: 'g2', name: 'Rent', clientId: 'uuid-2' },
        ],
      };
      MockedService.prototype.syncGroups.mockResolvedValue(mockResult as any);

      const res = await request(app)
        .put('/api/v1/transaction-groups/sync')
        .set('accessToken', 'valid-token')
        .send({
          groups: [
            { clientId: 'uuid-1', name: 'Trip' },
            { clientId: 'uuid-2', name: 'Rent', updatedAt: '2025-06-01T00:00:00Z' },
          ],
          deletedClientIds: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockResult);
      expect(res.body.output.synced).toBe(2);
      expect(res.body.output.created).toBe(1);
      expect(res.body.output.updated).toBe(1);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app)
          .put('/api/v1/transaction-groups/sync')
          .send({ groups: [], deletedClientIds: [] });

        expect(res.status).toBe(401);
      });
    });
  });
});
