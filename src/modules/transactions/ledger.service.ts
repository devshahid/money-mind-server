/**
 * Ledger Service
 *
 * Business logic for ledger operations including offline-first sync
 */

import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Ledger, LedgerEntry } from './models/ledger.model';
import type { ILedger, ILedgerEntry } from './models/ledger.model';
import { CustomError } from '../../shared/core/ApiError';
import { statusCode } from '../../constant';

interface SyncLedgerInput {
  id: string;
  clientId: string;
  partyName: string;
  createdAt: string;
  updatedAt: string;
}

class LedgerService {
  private userId: Types.ObjectId;

  constructor(userId: Types.ObjectId) {
    this.userId = userId;
  }

  /**
   * Create a new ledger
   */
  async create(partyName: string, clientId?: string) {
    const now = new Date().toISOString();
    // clientId is the single canonical id shared with the offline-first client.
    // Always guarantee one so entries and merges have a stable key, even when a
    // ledger is created directly via the server (no client-supplied clientId).
    const ledger = await Ledger.create({
      userId: this.userId,
      clientId: clientId || randomUUID(),
      partyName,
      createdAt: now,
      updatedAt: now,
    });
    return ledger;
  }

  /**
   * Get all ledgers for user
   */
  async getAll() {
    return Ledger.find({ userId: this.userId }).sort({ updatedAt: -1 });
  }

  /**
   * Get ledger with all its entries
   *
   * Entries are keyed by the ledger's clientId (the single canonical id shared
   * with the offline-first client), not the Mongo _id.
   */
  async getWithEntries(ledgerId: string | Types.ObjectId) {
    const ledger = await Ledger.findOne({
      _id: new Types.ObjectId(ledgerId),
      userId: this.userId,
    });

    if (!ledger) return null;

    const entries = await LedgerEntry.find({
      ledgerId: ledger.clientId,
    }).sort({ createdAt: -1 });

    return {
      ...ledger.toObject(),
      entries,
    };
  }

  /**
   * Update a ledger
   */
  async update(ledgerId: string | Types.ObjectId, data: Partial<ILedger>) {
    const ledger = await Ledger.findOneAndUpdate(
      { _id: new Types.ObjectId(ledgerId), userId: this.userId },
      { ...data, updatedAt: new Date().toISOString() },
      { new: true }
    );
    return ledger;
  }

  /**
   * Delete a ledger
   *
   * Cascades to its entries, which are keyed by the ledger's clientId.
   */
  async delete(ledgerId: string | Types.ObjectId) {
    const objectId = new Types.ObjectId(ledgerId);
    const ledger = await Ledger.findOneAndDelete({
      _id: objectId,
      userId: this.userId,
    });
    // Also delete all entries (keyed by clientId, the canonical ledger id)
    if (ledger) {
      await LedgerEntry.deleteMany({ ledgerId: ledger.clientId });
    }
  }

  /**
   * Add/link a transaction to a ledger
   */
  async addEntry(
    ledgerId: string | Types.ObjectId,
    transactionId: string,
    direction: 'i_paid' | 'they_paid',
    amount: number,
    entryId?: string,
    narration?: string,
    transactionDate?: string
  ) {
    const objectId = new Types.ObjectId(ledgerId);
    const ledger = await Ledger.findOne({
      _id: objectId,
      userId: this.userId,
    });

    if (!ledger) throw new Error('Ledger not found');

    // Entries are keyed by the ledger's clientId — the single canonical id the
    // offline-first client also uses — so server- and client-created entries
    // attach to the same ledger.
    const canonicalLedgerId = ledger.clientId;

    // Duplicate-prevention: a transaction may be linked to a ledger only once.
    const dup = await LedgerEntry.findOne({
      ledgerId: canonicalLedgerId,
      transactionId,
    });
    if (dup) {
      throw new CustomError(
        'This transaction is already linked to this ledger.',
        statusCode.CONFLICT
      );
    }

    const now = new Date().toISOString();
    const entry = await LedgerEntry.create({
      id: entryId || `entry_${Date.now()}_${Math.random()}`,
      ledgerId: canonicalLedgerId,
      transactionId,
      direction,
      amount,
      createdAt: now,
      narration,
      transactionDate,
    });

    // Update ledger's updatedAt
    ledger.updatedAt = now;
    await ledger.save();

    return entry;
  }

  /**
   * Remove an entry from a ledger
   */
  async removeEntry(ledgerId: string | Types.ObjectId, entryId: string) {
    const objectId = new Types.ObjectId(ledgerId);
    const ledger = await Ledger.findOne({
      _id: objectId,
      userId: this.userId,
    });
    if (!ledger) return;

    // Entries are keyed by the ledger's clientId (canonical id)
    const entry = await LedgerEntry.findOneAndDelete({
      id: entryId,
      ledgerId: ledger.clientId,
    });

    if (entry) {
      // Update ledger's updatedAt
      ledger.updatedAt = new Date().toISOString();
      await ledger.save();
    }
  }

  /**
   * Sync ledgers and entries with server
   * Implements offline-first merge: last-write-wins conflict resolution
   */
  async syncLedgers(
    ledgers: SyncLedgerInput[],
    entries: ILedgerEntry[],
    deletedLedgerIds: string[] = [],
    deletedEntryIds: string[] = []
  ) {
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Delete ledgers that were removed locally
    if (deletedLedgerIds.length > 0) {
      for (const clientId of deletedLedgerIds) {
        const result = await Ledger.findOneAndDelete({
          userId: this.userId,
          clientId,
        });
        if (result) deleted++;
      }
    }

    // Delete entries that were removed locally
    if (deletedEntryIds.length > 0) {
      for (const entryId of deletedEntryIds) {
        const result = await LedgerEntry.findOneAndDelete({
          id: entryId,
        });
        if (result) deleted++;
      }
    }

    // Sync ledgers: create or update
    for (const incoming of ledgers) {
      if (!incoming.clientId) continue;

      const existing = await Ledger.findOne({
        userId: this.userId,
        clientId: incoming.clientId,
      });

      if (existing) {
        // Last-write-wins: only update if incoming updatedAt is newer
        const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        const serverTime = new Date(existing.updatedAt).getTime();

        if (incomingTime > serverTime) {
          if (incoming.partyName !== undefined) existing.partyName = incoming.partyName;
          existing.updatedAt = incoming.updatedAt;
          await existing.save();
          updated++;
        }
      } else {
        await Ledger.create({
          userId: this.userId,
          clientId: incoming.clientId,
          partyName: incoming.partyName,
          createdAt: incoming.createdAt,
          updatedAt: incoming.updatedAt,
        });
        created++;
      }
    }

    // Sync entries: create or update
    for (const incoming of entries) {
      if (!incoming.id) continue;

      const existing = await LedgerEntry.findOne({
        id: incoming.id,
      });

      if (existing) {
        // Last-write-wins: only update if incoming createdAt is newer
        const incomingTime = incoming.createdAt ? new Date(incoming.createdAt).getTime() : 0;
        const serverTime = new Date(existing.createdAt).getTime();

        if (incomingTime > serverTime) {
          existing.direction = incoming.direction;
          existing.amount = incoming.amount;
          if (incoming.narration !== undefined) existing.narration = incoming.narration;
          if (incoming.transactionDate !== undefined)
            existing.transactionDate = incoming.transactionDate;
          await existing.save();
          updated++;
        }
      } else {
        // Defensive duplicate-prevention: skip creating an entry when one
        // already links this transaction to this ledger, so a buggy client
        // cannot introduce duplicates via sync.
        const dup = await LedgerEntry.findOne({
          ledgerId: incoming.ledgerId,
          transactionId: incoming.transactionId,
        });
        if (dup) continue;

        await LedgerEntry.create({
          id: incoming.id,
          ledgerId: incoming.ledgerId,
          transactionId: incoming.transactionId,
          direction: incoming.direction,
          amount: incoming.amount,
          createdAt: incoming.createdAt,
          narration: incoming.narration,
          transactionDate: incoming.transactionDate,
        });
        created++;
      }
    }

    // Return canonical state
    const allLedgers = await Ledger.find({ userId: this.userId }).sort({ updatedAt: -1 }).lean();

    const allEntries = await LedgerEntry.find({}).lean();

    return {
      synced: created + updated + deleted,
      created,
      updated,
      deleted,
      ledgers: allLedgers,
      entries: allEntries,
    };
  }

  /**
   * Get all entries for a ledger
   *
   * Entries are keyed by the ledger's clientId (canonical id).
   */
  async getEntries(ledgerId: string | Types.ObjectId) {
    const objectId = new Types.ObjectId(ledgerId);
    const ledger = await Ledger.findOne({
      _id: objectId,
      userId: this.userId,
    });
    if (!ledger) return [];
    return LedgerEntry.find({ ledgerId: ledger.clientId }).sort({ createdAt: -1 });
  }
}

export { LedgerService };
