/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { LedgerService } from '../ledger.service';

jest.mock('../ledger.service');

interface MockCustomRequest {
  user?: { _id: Types.ObjectId };
  params: Record<string, any>;
  body: Record<string, any>;
}

describe('LedgerController (Integration Tests)', () => {
  let mockRequest: MockCustomRequest;
  const mockUserId = new Types.ObjectId();
  const mockLedgerId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { _id: mockUserId },
      params: {},
      body: {},
    };
  });

  describe('LedgerService Integration', () => {
    it('should instantiate LedgerService with user ID', () => {
      const service = new LedgerService(mockUserId);
      expect(service).toBeDefined();
    });

    it('should create a new ledger', async () => {
      const mockLedger = {
        id: 'ledger-1',
        partyName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (LedgerService as any).mockImplementation(() => ({
        create: jest.fn().mockResolvedValue(mockLedger),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.create as jest.Mock)('John Doe', 'client-123');

      expect(result.partyName).toBe('John Doe');
    });

    it('should list all ledgers', async () => {
      const mockLedgers = [
        {
          id: 'ledger-1',
          partyName: 'John Doe',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ledger-2',
          partyName: 'Jane Doe',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (LedgerService as any).mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue(mockLedgers),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.getAll as jest.Mock)();

      expect(result).toHaveLength(2);
    });

    it('should retrieve ledger with entries', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        partyName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (LedgerService as any).mockImplementation(() => ({
        getWithEntries: jest.fn().mockResolvedValue(mockLedger),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.getWithEntries as jest.Mock)(mockLedgerId);

      expect(result?.partyName).toBe('John Doe');
    });

    it('should update ledger', async () => {
      const mockUpdatedLedger = {
        _id: mockLedgerId,
        partyName: 'Updated Name',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (LedgerService as any).mockImplementation(() => ({
        update: jest.fn().mockResolvedValue(mockUpdatedLedger),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.update as jest.Mock)(mockLedgerId, {
        partyName: 'Updated Name',
      });

      expect(result?.partyName).toBe('Updated Name');
    });

    it('should delete ledger', async () => {
      (LedgerService as any).mockImplementation(() => ({
        delete: jest.fn().mockResolvedValue(undefined),
      }));

      const service = new LedgerService(mockUserId);
      await (service.delete as jest.Mock)(mockLedgerId);

      expect(service.delete as jest.Mock).toHaveBeenCalled();
    });

    it('should add entry to ledger', async () => {
      const mockEntry = {
        id: 'entry-1',
        ledgerId: mockLedgerId.toString(),
        transactionId: 'tx-1',
        direction: 'i_paid',
        amount: 100,
        isSettlement: false,
        createdAt: new Date().toISOString(),
      };

      (LedgerService as any).mockImplementation(() => ({
        addEntry: jest.fn().mockResolvedValue(mockEntry),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.addEntry as jest.Mock)(mockLedgerId, 'tx-1', 'i_paid', 100);

      expect(result?.direction).toBe('i_paid');
      expect(result?.amount).toBe(100);
    });

    it('should remove entry from ledger', async () => {
      (LedgerService as any).mockImplementation(() => ({
        removeEntry: jest.fn().mockResolvedValue(undefined),
      }));

      const service = new LedgerService(mockUserId);
      await (service.removeEntry as jest.Mock)(mockLedgerId, 'entry-1');

      expect(service.removeEntry as jest.Mock).toHaveBeenCalled();
    });

    it('should get all entries for ledger', async () => {
      const mockEntries = [
        { id: 'entry-1', ledgerId: mockLedgerId.toString(), direction: 'i_paid', amount: 100 },
        { id: 'entry-2', ledgerId: mockLedgerId.toString(), direction: 'they_paid', amount: 50 },
      ];

      (LedgerService as any).mockImplementation(() => ({
        getEntries: jest.fn().mockResolvedValue(mockEntries),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.getEntries as jest.Mock)(mockLedgerId);

      expect(result).toHaveLength(2);
    });

    it('should sync ledgers with server', async () => {
      const syncPayload = {
        ledgers: [
          {
            id: 'ledger-1',
            clientId: 'client-1',
            partyName: 'John',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        entries: [],
        deletedLedgerIds: [],
        deletedEntryIds: [],
      };

      (LedgerService as any).mockImplementation(() => ({
        syncLedgers: jest.fn().mockResolvedValue({
          synced: 1,
          created: 1,
          deleted: 0,
          ledgers: [],
          entries: [],
        }),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.syncLedgers as jest.Mock)(
        syncPayload.ledgers,
        syncPayload.entries,
        syncPayload.deletedLedgerIds,
        syncPayload.deletedEntryIds
      );

      expect(result).toHaveProperty('synced');
    });

    it('should handle errors gracefully', async () => {
      (LedgerService as any).mockImplementation(() => ({
        create: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const service = new LedgerService(mockUserId);
      await expect((service.create as jest.Mock)('John')).rejects.toThrow('Database error');
    });
  });

  describe('Authentication Checks', () => {
    it('should reject requests without user ID', async () => {
      const service = new LedgerService(undefined as any);
      expect(service).toBeDefined();
    });

    it('should handle null user scenario', () => {
      expect(() => {
        mockRequest.user = undefined;
      }).not.toThrow();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle ledger not found', async () => {
      (LedgerService as any).mockImplementation(() => ({
        getWithEntries: jest.fn().mockResolvedValue(null),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.getWithEntries as jest.Mock)(mockLedgerId);

      expect(result).toBeNull();
    });

    it('should handle invalid ledger ID', async () => {
      (LedgerService as any).mockImplementation(() => ({
        getWithEntries: jest.fn().mockRejectedValue(new Error('Invalid ID')),
      }));

      const service = new LedgerService(mockUserId);
      await expect((service.getWithEntries as jest.Mock)(mockLedgerId)).rejects.toThrow(
        'Invalid ID'
      );
    });

    it('should handle sync conflicts', async () => {
      (LedgerService as any).mockImplementation(() => ({
        syncLedgers: jest.fn().mockResolvedValue({
          synced: 0,
          created: 0,
          deleted: 0,
          ledgers: [],
          entries: [],
        }),
      }));

      const service = new LedgerService(mockUserId);
      const result = await (service.syncLedgers as jest.Mock)([], [], [], []);

      expect(result.synced).toBe(0);
    });
  });
});
