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

  // The mongoose model auto-mock shares a single `find` mock between Ledger and
  // LedgerEntry (both are Models with the same prototype methods). syncLedgers
  // ends with two chained reads off that shared mock:
  //   Ledger.find({...}).sort({updatedAt:-1}).lean()  -> ledgers
  //   LedgerEntry.find({}).lean()                      -> entries
  // A single return object must therefore satisfy BOTH shapes: `.sort()` yields
  // the ledgers-bearing chain, while a bare `.lean()` yields the entries.
  //
  // syncLedgers now performs an ADDITIONAL read to resolve the caller's owned
  // ledger clientIds (the fix that closes the cross-user entry IDOR):
  //   Ledger.find({userId}).select('clientId').lean() -> [{clientId}, ...]
  // So the shared chain must also satisfy `.select().lean()`, yielding the set
  // of owned ledgers. `ownedLedgers` defaults to `ledgers` (any ledger the user
  // owns), but callers can pass an explicit list of {clientId} objects when the
  // owned set differs from the canonical-state ledgers.
  const mockFinalReads = (ledgers: any[] = [], entries: any[] = [], ownedLedgers?: any[]): void => {
    const owned = ownedLedgers ?? ledgers;
    const chain = {
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(ledgers),
      }),
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(owned),
      }),
      lean: jest.fn().mockResolvedValue(entries),
    };
    (Ledger.find as any).mockReturnValue(chain);
    (LedgerEntry.find as any).mockReturnValue(chain);
  };

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

      (Ledger.create as any).mockResolvedValue(mockLedger);

      const result = await service.create('John Doe', 'client-123');

      expect(result).toBeDefined();
      expect(result.partyName).toBe('John Doe');
      expect(result.userId).toEqual(mockUserId);
    });

    it('should create a ledger with auto-generated clientId if not provided', async () => {
      const mockLedger = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-generated',
        partyName: 'Jane Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        save: jest.fn().mockResolvedValue(true),
      };

      (Ledger.create as any).mockResolvedValue(mockLedger);

      const result = await service.create('Jane Doe');

      expect(result).toBeDefined();
      expect(result.partyName).toBe('Jane Doe');
      expect(Ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: expect.any(String),
        })
      );
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

      const ledgerDoc = {
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
        partyName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // The service spreads `ledger.toObject()` into its result, mirroring a
      // real mongoose document, so the mock must expose that method.
      const mockLedger = {
        ...ledgerDoc,
        toObject: jest.fn().mockReturnValue(ledgerDoc),
      };

      (Ledger.findOne as any).mockResolvedValue(mockLedger);
      (LedgerEntry.find as any).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEntries),
      });

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
        save: jest.fn().mockResolvedValue(true),
      };

      (Ledger.findOne as any).mockResolvedValueOnce(existingLedger);
      mockFinalReads([]);

      await service.syncLedgers([incomingLedger], [], [], []);

      expect(existingLedger.save).toHaveBeenCalled();
      expect(existingLedger.partyName).toBe('John Doe (Updated)');
      expect(existingLedger.updatedAt).toBe(now);
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
        save: jest.fn().mockResolvedValue(true),
      };

      (Ledger.findOne as any).mockResolvedValueOnce(existingLedger);
      mockFinalReads([existingLedger]);

      await service.syncLedgers([incomingLedger], [], [], []);

      // Should not persist since incoming is older
      expect(existingLedger.save).not.toHaveBeenCalled();
    });

    it('should delete ledgers marked for deletion', async () => {
      (Ledger.findOneAndDelete as any).mockResolvedValue({ _id: 'x', clientId: 'ledger-1' });
      mockFinalReads([]);

      await service.syncLedgers([], [], ['ledger-1'], []);

      expect(Ledger.findOneAndDelete).toHaveBeenCalledWith({
        userId: expect.anything(),
        clientId: 'ledger-1',
      });
    });

    it('should delete entries marked for deletion, scoped to the caller', async () => {
      (LedgerEntry.findOneAndDelete as any).mockResolvedValue({ id: 'entry-1' });
      mockFinalReads([]);

      await service.syncLedgers([], [], [], ['entry-1', 'entry-2']);

      // Deletes MUST be scoped by userId so a caller cannot delete another
      // user's entry by passing its id in deletedEntryIds.
      expect(LedgerEntry.findOneAndDelete).toHaveBeenCalledWith({
        id: 'entry-1',
        userId: mockUserId,
      });
      expect(LedgerEntry.findOneAndDelete).toHaveBeenCalledWith({
        id: 'entry-2',
        userId: mockUserId,
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
      (Ledger.findOneAndDelete as any).mockResolvedValue({ clientId: 'ledger-deleted' });
      (LedgerEntry.findOneAndDelete as any).mockResolvedValue({ id: 'entry-deleted' });
      mockFinalReads([newLedger]);

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

    it('does NOT create/modify an entry whose ledgerId is not owned by the caller', async () => {
      const now = new Date().toISOString();

      // Incoming entry references a ledger the caller does NOT own.
      const foreignEntry = {
        id: 'foreign-entry',
        ledgerId: 'not-my-ledger',
        transactionId: 'tx-x',
        direction: 'i_paid' as const,
        amount: 100,
        createdAt: now,
      };

      // Caller owns only 'client-mine' (the owned-clientId resolution result).
      mockFinalReads([], [], [{ clientId: 'client-mine' }]);

      const result = await service.syncLedgers([], [foreignEntry as any], [], []);

      // The ownership guard must short-circuit BEFORE any entry lookup, upsert,
      // or create — the caller must not touch a ledger they don't own.
      expect(LedgerEntry.findOne).not.toHaveBeenCalled();
      expect(LedgerEntry.create).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('creates an entry whose ledgerId IS owned by the caller', async () => {
      const now = new Date().toISOString();

      const ownedEntry = {
        id: 'my-entry',
        ledgerId: 'client-mine',
        transactionId: 'tx-1',
        direction: 'i_paid' as const,
        amount: 250,
        createdAt: now,
      };

      // Owned set includes this entry's ledgerId.
      mockFinalReads([], [], [{ clientId: 'client-mine' }]);
      // No existing entry (update lookup) and no duplicate (dup lookup).
      (LedgerEntry.findOne as any).mockResolvedValue(null);
      (LedgerEntry.create as any).mockResolvedValue(ownedEntry);

      const result = await service.syncLedgers([], [ownedEntry as any], [], []);

      // The created entry MUST be stamped with the caller's userId.
      expect(LedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-entry',
          ledgerId: 'client-mine',
          userId: mockUserId,
        })
      );
      expect(result.created).toBe(1);
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

      (Ledger.findOne as any).mockResolvedValue({
        _id: mockLedgerId,
        userId: mockUserId,
        clientId: 'client-123',
      });
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
