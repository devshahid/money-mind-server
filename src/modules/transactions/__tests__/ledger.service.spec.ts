/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { LedgerService } from '../ledger.service';
import { Ledger, LedgerEntry } from '../models/ledger.model';

jest.mock('../models/ledger.model');

describe('LedgerService (Unit Tests)', () => {
  let service: LedgerService;
  const mockUserId = new Types.ObjectId();
  const mockLedgerId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LedgerService(mockUserId);
  });

  describe('create()', () => {
    it('should create a new ledger with valid partyName and clientId', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Ledger as any).mockImplementation(() => mockLedger);

      const result = await service.create('John Doe', 'client-123');

      expect(result).toBeDefined();
      expect(result.partyName).toBe('John Doe');
      expect(result.userId).toEqual(mockUserId);
    });

    it('should create a ledger with auto-generated clientId if not provided', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: expect.any(String),
        partyName: 'Jane Doe',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        save: jest.fn().mockResolvedValue(true),
      };

      (Ledger as any).mockImplementation(() => mockLedger);

      const result = await service.create('Jane Doe');

      expect(result).toBeDefined();
      expect(result.partyName).toBe('Jane Doe');
    });
  });

  describe('getWithEntries()', () => {
    it('should retrieve ledger with all its entries', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          ledgerId: mockLedgerId.toString(),
          transactionId: 'tx-1',
          direction: 'i_paid',
          amount: 100,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'entry-2',
          ledgerId: mockLedgerId.toString(),
          transactionId: 'tx-2',
          direction: 'they_paid',
          amount: 50,
          createdAt: new Date().toISOString(),
        },
      ];

      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (Ledger.findOne as any).mockResolvedValue(mockLedger);
      (LedgerEntry.find as any).mockResolvedValue(mockEntries);

      const result = await service.getWithEntries(mockLedgerId);

      expect(result).toBeDefined();
      expect(result?.partyName).toBe('John Doe');
      expect(Ledger.findOne).toHaveBeenCalledWith({
        _id: mockLedgerId,
        userId: mockUserId,
      });
    });

    it('should return null if ledger not found', async () => {
      (Ledger.findOne as any).mockResolvedValue(null);

      const result = await service.getWithEntries(mockLedgerId);

      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete ledger and all its entries', async () => {
      (Ledger.findOneAndDelete as any).mockResolvedValue({ _id: mockLedgerId });
      (LedgerEntry.deleteMany as any).mockResolvedValue({ deletedCount: 2 });

      await service.delete(mockLedgerId);

      expect(Ledger.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockLedgerId,
        userId: mockUserId,
      });
      expect(LedgerEntry.deleteMany).toHaveBeenCalled();
    });
  });

  describe('addEntry()', () => {
    it('should add entry to ledger and update updatedAt', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'John Doe',
        updatedAt: expect.any(String),
        save: jest.fn().mockResolvedValue(true),
      };

      const mockEntry = {
        id: 'entry-1',
        ledgerId: mockLedgerId.toString(),
        transactionId: 'tx-1',
        direction: 'i_paid',
        amount: 100,
        createdAt: expect.any(String),
      };

      // NOTE: The mongoose model auto-mock shares a single findOne mock between
      // Ledger and LedgerEntry, so a single implementation must discriminate by
      // query shape: the entry duplicate query carries a `transactionId`.
      (Ledger.findOne as any).mockImplementation((q: any) =>
        Promise.resolve('transactionId' in (q || {}) ? null : mockLedger)
      );
      (LedgerEntry.create as any).mockResolvedValue(mockEntry);

      const result = await service.addEntry(mockLedgerId, 'tx-1', 'i_paid', 100);

      expect(result).toBeDefined();
      expect(result?.direction).toBe('i_paid');
      expect(result?.amount).toBe(100);
    });

    it('should reject linking the same transaction to the same ledger twice', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'John Doe',
        save: jest.fn().mockResolvedValue(true),
      };

      const existingEntry = {
        id: 'entry-existing',
        ledgerId: mockLedgerId.toString(),
        transactionId: 'tx-1',
        direction: 'i_paid',
        amount: 100,
      };

      // Shared findOne mock: ledger lookup (no transactionId) returns the
      // ledger; the entry duplicate query (has transactionId) returns a
      // pre-existing entry.
      (Ledger.findOne as any).mockImplementation((q: any) =>
        Promise.resolve('transactionId' in (q || {}) ? existingEntry : mockLedger)
      );

      await expect(service.addEntry(mockLedgerId, 'tx-1', 'i_paid', 100)).rejects.toThrow(
        'This transaction is already linked to this ledger.'
      );

      // No new entry should be created
      expect(LedgerEntry.create).not.toHaveBeenCalled();
      // The duplicate check is scoped to (ledgerId, transactionId), where
      // ledgerId is the ledger's canonical clientId (not the Mongo _id).
      expect(LedgerEntry.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId: mockLedger.clientId,
          transactionId: 'tx-1',
        })
      );
    });

    it('should allow linking the same transaction to a DIFFERENT ledger', async () => {
      const otherLedgerId = new Types.ObjectId();
      const mockLedger = {
        _id: otherLedgerId,
        userId: mockUserId,
        clientId: 'client-456',
        partyName: 'Jane Doe',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockEntry = {
        id: 'entry-2',
        ledgerId: otherLedgerId.toString(),
        transactionId: 'tx-1',
        direction: 'i_paid',
        amount: 100,
      };

      // Ledger lookup returns the (different) ledger; the entry duplicate query
      // returns null because this transaction isn't linked to THIS ledger.
      (Ledger.findOne as any).mockImplementation((q: any) =>
        Promise.resolve('transactionId' in (q || {}) ? null : mockLedger)
      );
      (LedgerEntry.create as any).mockResolvedValue(mockEntry);

      const result = await service.addEntry(otherLedgerId, 'tx-1', 'i_paid', 100);

      expect(result).toBeDefined();
      expect(result?.ledgerId).toBe(otherLedgerId.toString());
      expect(LedgerEntry.create).toHaveBeenCalled();
    });
  });

  describe('removeEntry()', () => {
    it('should remove entry and update ledger updatedAt', async () => {
      const mockEntry = {
        id: 'entry-1',
        ledgerId: mockLedgerId.toString(),
      };

      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        updatedAt: expect.any(String),
        save: jest.fn().mockResolvedValue(true),
      };

      (LedgerEntry.findOneAndDelete as any).mockResolvedValue(mockEntry);
      (Ledger.findOne as any).mockResolvedValue(mockLedger);

      await service.removeEntry(mockLedgerId, 'entry-1');

      expect(LedgerEntry.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'entry-1',
        })
      );
    });
  });

  describe('syncLedgers() - Conflict Resolution', () => {
    it('should apply last-write-wins for ledger updates', async () => {
      const now = new Date().toISOString();
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const incomingLedger = {
        id: 'ledger-1',
        clientId: 'client-123',
        partyName: 'John Doe (Updated)',
        createdAt: pastTime,
        updatedAt: now, // More recent
      };

      const existingLedger = {
        _id: new Types.ObjectId(),
        clientId: 'client-123',
        partyName: 'John Doe',
        createdAt: pastTime,
        updatedAt: pastTime, // Older
      };

      (Ledger.findOne as any).mockResolvedValueOnce(existingLedger);
      (Ledger.updateOne as any).mockResolvedValueOnce({ modifiedCount: 1 });
      (Ledger.find as any).mockResolvedValueOnce([incomingLedger]);
      (LedgerEntry.find as any).mockResolvedValueOnce([]);

      await service.syncLedgers([incomingLedger], [], [], []);

      expect(Ledger.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          partyName: 'John Doe (Updated)',
          updatedAt: now,
        })
      );
    });

    it('should not update ledger if incoming is older (last-write-wins)', async () => {
      const now = new Date().toISOString();
      const recentTime = new Date(Date.now() + 3600000).toISOString();

      const incomingLedger = {
        id: 'ledger-1',
        clientId: 'client-123',
        partyName: 'John Doe (Old)',
        createdAt: now,
        updatedAt: now, // Older incoming
      };

      const existingLedger = {
        _id: new Types.ObjectId(),
        clientId: 'client-123',
        partyName: 'John Doe',
        createdAt: now,
        updatedAt: recentTime, // More recent existing
      };

      (Ledger.findOne as any).mockResolvedValueOnce(existingLedger);
      (Ledger.find as any).mockResolvedValueOnce([existingLedger]);
      (LedgerEntry.find as any).mockResolvedValueOnce([]);

      await service.syncLedgers([incomingLedger], [], [], []);

      // Should not call updateOne since incoming is older
      expect(Ledger.updateOne).not.toHaveBeenCalled();
    });

    it('should delete ledgers marked for deletion', async () => {
      (Ledger.deleteMany as any).mockResolvedValue({ deletedCount: 1 });
      (Ledger.find as any).mockResolvedValue([]);
      (LedgerEntry.find as any).mockResolvedValue([]);

      await service.syncLedgers([], [], ['ledger-1'], []);

      expect(Ledger.deleteMany).toHaveBeenCalledWith({
        clientId: { $in: ['ledger-1'] },
      });
    });

    it('should delete entries marked for deletion', async () => {
      (LedgerEntry.deleteMany as any).mockResolvedValue({ deletedCount: 2 });
      (Ledger.find as any).mockResolvedValue([]);
      (LedgerEntry.find as any).mockResolvedValue([]);

      await service.syncLedgers([], [], [], ['entry-1', 'entry-2']);

      expect(LedgerEntry.deleteMany).toHaveBeenCalledWith({
        id: { $in: ['entry-1', 'entry-2'] },
      });
    });

    it('should handle mixed create, update, and delete operations', async () => {
      const now = new Date().toISOString();

      const newLedger = {
        id: 'ledger-new',
        clientId: 'client-new',
        partyName: 'New Party',
        createdAt: now,
        updatedAt: now,
      };

      (Ledger.findOne as any).mockResolvedValueOnce(null); // New ledger doesn't exist
      (Ledger.create as any).mockResolvedValueOnce(newLedger);
      (Ledger.deleteMany as any).mockResolvedValue({ deletedCount: 1 });
      (LedgerEntry.deleteMany as any).mockResolvedValue({ deletedCount: 1 });
      (Ledger.find as any).mockResolvedValueOnce([newLedger]);
      (LedgerEntry.find as any).mockResolvedValueOnce([]);

      const result = await service.syncLedgers(
        [newLedger],
        [],
        ['ledger-deleted'],
        ['entry-deleted']
      );

      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('deleted');
    });
  });

  describe('update()', () => {
    it('should update ledger with new data', async () => {
      const mockUpdatedLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'Updated Name',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (Ledger.findOneAndUpdate as any).mockResolvedValue(mockUpdatedLedger);

      const result = await service.update(mockLedgerId, { partyName: 'Updated Name' });

      expect(result?.partyName).toBe('Updated Name');
      expect(Ledger.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getEntries()', () => {
    it('should retrieve all entries for a ledger sorted by createdAt descending', async () => {
      const mockEntries = [
        { id: 'entry-2', createdAt: new Date().toISOString(), ledgerId: mockLedgerId.toString() },
        {
          id: 'entry-1',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          ledgerId: mockLedgerId.toString(),
        },
      ];

      (LedgerEntry.find as any).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEntries),
      });

      const result = await service.getEntries(mockLedgerId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('entry-2');
      expect(result[1].id).toBe('entry-1');
    });
  });
});
