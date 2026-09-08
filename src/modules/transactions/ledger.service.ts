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

type SyncOperation =
  | { id: string; type: 'upsert_ledger'; ledger: SyncLedgerInput }
  | { id: string; type: 'delete_ledger'; ledgerId: string }
  | { id: string; type: 'link_entry'; entry: ILedgerEntry }
  | { id: string; type: 'unlink_entry'; ledgerId: string; entryId: string };

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
    const ledgers = await Ledger.find({ userId: this.userId }).sort({ updatedAt: -1 }).lean();
    const ledgerClientIds = ledgers.map((ledger) => ledger.clientId);
    const summaries = await LedgerEntry.aggregate([
      { $match: { userId: this.userId.toString(), ledgerId: { $in: ledgerClientIds } } },
      {
        $group: {
          _id: '$ledgerId',
          entryCount: { $sum: 1 },
          balance: {
            $sum: {
              $cond: [{ $eq: ['$direction', 'i_paid'] }, '$amount', { $multiply: ['$amount', -1] }],
            },
          },
        },
      },
    ]);
    const summariesByLedgerId = new Map(
      summaries.map((summary) => [
        summary._id,
        { entryCount: summary.entryCount, balance: summary.balance },
      ])
    );

    return ledgers.map((ledger) => ({
      ...ledger,
      ...(summariesByLedgerId.get(ledger.clientId) || { entryCount: 0, balance: 0 }),
    }));
  }

  /**
   * Get ledger with all its entries
   *
   * Entries are keyed by the ledger's clientId (the single canonical id shared
   * with the offline-first client), not the Mongo _id.
   */
  async getWithEntries(ledgerId: string | Types.ObjectId) {
    const ledgerQuery = Types.ObjectId.isValid(ledgerId.toString())
      ? {
          userId: this.userId,
          $or: [{ _id: new Types.ObjectId(ledgerId) }, { clientId: ledgerId.toString() }],
        }
      : { userId: this.userId, clientId: ledgerId.toString() };
    const ledger = await Ledger.findOne(ledgerQuery);

    if (!ledger) return null;

    const entries = await LedgerEntry.find({
      ledgerId: ledger.clientId,
      userId: this.userId,
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
    // Scope by userId too (defense-in-depth); the parent ledger is already
    // owner-checked above, so this does not change behaviour.
    const dup = await LedgerEntry.findOne({
      ledgerId: canonicalLedgerId,
      transactionId,
      userId: this.userId,
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
      userId: this.userId,
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

    // Entries are keyed by the ledger's clientId (canonical id). Scope by
    // userId too (defense-in-depth); the parent ledger is already owner-checked.
    const entry = await LedgerEntry.findOneAndDelete({
      id: entryId,
      ledgerId: ledger.clientId,
      userId: this.userId,
    });

    if (entry) {
      // Update ledger's updatedAt
      ledger.updatedAt = new Date().toISOString();
      await ledger.save();
    }
  }

  /**
   * Apply only client mutations that are still pending. Each mutation is
   * naturally idempotent: linking checks both the entry id and the
   * ledger/transaction pair; deletes are no-ops when already applied.
   */
  async syncOperations(operations: SyncOperation[]) {
    const processedOperationIds: string[] = [];

    const processLinkBlock = async (
      linkOperations: Array<Extract<SyncOperation, { type: 'link_entry' }>>
    ) => {
      const ledgerClientIds = [
        ...new Set(linkOperations.map((operation) => operation.entry.ledgerId)),
      ];
      const entryIds = [...new Set(linkOperations.map((operation) => operation.entry.id))];

      const ownedLedgers = await Ledger.find({
        userId: this.userId,
        clientId: { $in: ledgerClientIds },
      })
        .select('clientId')
        .lean();

      const ownedLedgerClientIds = new Set(
        ownedLedgers.map((ledger) => (ledger as { clientId: string }).clientId)
      );

      const entryPairFilters = [
        ...new Map(
          linkOperations.map((operation) => {
            const { ledgerId, transactionId } = operation.entry;
            return [`${ledgerId}\u0000${transactionId}`, { ledgerId, transactionId }];
          })
        ).values(),
      ];

      const existingEntries = await LedgerEntry.find({
        userId: this.userId,
        $or: [{ id: { $in: entryIds } }, ...entryPairFilters],
      }).lean();

      const existingEntryIds = new Set(existingEntries.map((entry) => entry.id));

      const existingEntryPairs = new Set(
        existingEntries.map((entry) => `${entry.ledgerId}\u0000${entry.transactionId}`)
      );

      const acceptedEntryIds = new Set<string>();
      const acceptedEntryPairs = new Set<string>();

      const pendingInserts: Array<{
        insertOne: { document: Record<string, unknown> };
      }> = [];

      const blockProcessedOperationIds: string[] = [];

      for (const operation of linkOperations) {
        const entry = operation.entry;
        const entryPair = `${entry.ledgerId}\u0000${entry.transactionId}`;

        if (!ownedLedgerClientIds.has(entry.ledgerId)) continue;

        blockProcessedOperationIds.push(operation.id);
        if (
          existingEntryIds.has(entry.id) ||
          existingEntryPairs.has(entryPair) ||
          acceptedEntryIds.has(entry.id) ||
          acceptedEntryPairs.has(entryPair)
        ) {
          continue;
        }

        acceptedEntryIds.add(entry.id);
        acceptedEntryPairs.add(entryPair);
        pendingInserts.push({
          insertOne: {
            document: {
              ...entry,
              userId: this.userId,
            },
          },
        });
      }

      if (pendingInserts.length > 0) {
        await LedgerEntry.bulkWrite(pendingInserts, { ordered: true });
      }

      processedOperationIds.push(...blockProcessedOperationIds);
    };

    const processUnlinkBlock = async (
      unlinkOperations: Array<Extract<SyncOperation, { type: 'unlink_entry' }>>
    ) => {
      const ledgerClientIds = [...new Set(unlinkOperations.map((operation) => operation.ledgerId))];
      const ownedLedgers = await Ledger.find({
        userId: this.userId,
        clientId: { $in: ledgerClientIds },
      })
        .select('clientId')
        .lean();
      const ownedLedgerClientIds = new Set(
        ownedLedgers.map((ledger) => (ledger as { clientId: string }).clientId)
      );
      const entryIdsByLedger = new Map<string, Set<string>>();
      const blockProcessedOperationIds: string[] = [];

      for (const operation of unlinkOperations) {
        if (!ownedLedgerClientIds.has(operation.ledgerId)) continue;

        blockProcessedOperationIds.push(operation.id);
        const entryIds = entryIdsByLedger.get(operation.ledgerId) || new Set<string>();
        entryIds.add(operation.entryId);
        entryIdsByLedger.set(operation.ledgerId, entryIds);
      }

      const entryFilters = [...entryIdsByLedger].map(([ledgerId, entryIds]) => ({
        ledgerId,
        id: { $in: [...entryIds] },
      }));
      if (entryFilters.length > 0) {
        await LedgerEntry.deleteMany({
          userId: this.userId,
          $or: entryFilters,
        });
      }

      processedOperationIds.push(...blockProcessedOperationIds);
    };

    let operationIndex = 0;
    while (operationIndex < operations.length) {
      const operation = operations[operationIndex];
      if (!operation?.id) {
        operationIndex++;
        continue;
      }

      if (operation.type === 'link_entry') {
        const linkOperations: Array<Extract<SyncOperation, { type: 'link_entry' }>> = [];
        while (
          operationIndex < operations.length &&
          operations[operationIndex]?.id &&
          operations[operationIndex]?.type === 'link_entry'
        ) {
          linkOperations.push(
            operations[operationIndex] as Extract<SyncOperation, { type: 'link_entry' }>
          );
          operationIndex++;
        }
        await processLinkBlock(linkOperations);
        continue;
      }

      if (operation.type === 'unlink_entry') {
        const unlinkOperations: Array<Extract<SyncOperation, { type: 'unlink_entry' }>> = [];
        while (
          operationIndex < operations.length &&
          operations[operationIndex]?.id &&
          operations[operationIndex]?.type === 'unlink_entry'
        ) {
          unlinkOperations.push(
            operations[operationIndex] as Extract<SyncOperation, { type: 'unlink_entry' }>
          );
          operationIndex++;
        }
        await processUnlinkBlock(unlinkOperations);
        continue;
      }

      if (operation.type === 'upsert_ledger') {
        const incoming = operation.ledger;
        if (!incoming?.clientId) {
          operationIndex++;
          continue;
        }
        const existing = await Ledger.findOne({ userId: this.userId, clientId: incoming.clientId });
        if (existing) {
          const incomingTime = new Date(incoming.updatedAt || 0).getTime();
          if (incomingTime > new Date(existing.updatedAt).getTime()) {
            existing.partyName = incoming.partyName;
            existing.updatedAt = incoming.updatedAt;
            await existing.save();
          }
        } else {
          await Ledger.create({
            userId: this.userId,
            clientId: incoming.clientId,
            partyName: incoming.partyName,
            createdAt: incoming.createdAt,
            updatedAt: incoming.updatedAt,
          });
        }
        processedOperationIds.push(operation.id);
        operationIndex++;
        continue;
      }

      if (operation.type === 'delete_ledger') {
        const ledger = await Ledger.findOneAndDelete({
          userId: this.userId,
          clientId: operation.ledgerId,
        });
        if (ledger)
          await LedgerEntry.deleteMany({ userId: this.userId, ledgerId: ledger.clientId });
        processedOperationIds.push(operation.id);
        operationIndex++;
        continue;
      }

      operationIndex++;
    }

    const ledgers = await Ledger.find({ userId: this.userId }).sort({ updatedAt: -1 }).lean();
    const ledgerIds = ledgers.map((ledger) => (ledger as { clientId: string }).clientId);
    const entries = ledgerIds.length
      ? await LedgerEntry.find({ userId: this.userId, ledgerId: { $in: ledgerIds } }).lean()
      : [];
    return { ledgers, entries, processedOperationIds };
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

    // Resolve the set of ledger clientIds this caller owns. Computed AFTER the
    // ledger upserts above so ledgers created in THIS same sync are included.
    // Every entry delete/create/update below is constrained to this set so a
    // caller can never touch an entry on a ledger they do not own (the IDOR
    // this fix closes). LedgerEntry now also carries userId (defense-in-depth),
    // so the actual writes filter by userId as well.
    const ownedLedgers = await Ledger.find({ userId: this.userId }).select('clientId').lean();
    const ownedClientIds = new Set<string>(
      ownedLedgers.map((l) => (l as { clientId: string }).clientId)
    );

    // Delete entries that were removed locally. Scope the delete to the caller
    // (by userId) so a client cannot delete another user's entries by passing
    // their entry ids in deletedEntryIds.
    if (deletedEntryIds.length > 0) {
      for (const entryId of deletedEntryIds) {
        const result = await LedgerEntry.findOneAndDelete({
          id: entryId,
          userId: this.userId,
        });
        if (result) deleted++;
      }
    }

    // Sync entries: create or update
    for (const incoming of entries) {
      if (!incoming.id) continue;

      // Ownership guard: a user must not attach or modify an entry on a ledger
      // they do not own. Skip any incoming entry whose ledgerId is not one of
      // the caller's ledger clientIds.
      if (!ownedClientIds.has(incoming.ledgerId)) continue;

      // Scope the lookup to the caller. If an entry with this id exists but
      // belongs to another user, this returns null and the create branch runs;
      // because `id` is globally unique, LedgerEntry.create will then throw on
      // the duplicate key rather than silently overwriting the other user's
      // row — a colliding id from another user is never overwritten here.
      const existing = await LedgerEntry.findOne({
        id: incoming.id,
        userId: this.userId,
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
          userId: this.userId,
        });
        if (dup) continue;

        await LedgerEntry.create({
          id: incoming.id,
          userId: this.userId,
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

    // Scope entries to THIS user's ledgers, by both the user's ledger clientIds
    // (the canonical key entries are stored under) and userId (defense-in-depth
    // now that LedgerEntry carries userId). An unscoped `find({})` here returned
    // every entry for every user — an unbounded read that grows with the whole
    // collection (a real timeout risk as data accumulates) and also leaked
    // other users' entries into this user's sync response.
    const ledgerClientIds = allLedgers.map((l) => (l as { clientId: string }).clientId);
    const allEntries =
      ledgerClientIds.length > 0
        ? await LedgerEntry.find({
            ledgerId: { $in: ledgerClientIds },
            userId: this.userId,
          }).lean()
        : [];

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
    return LedgerEntry.find({ ledgerId: ledger.clientId, userId: this.userId }).sort({
      createdAt: -1,
    });
  }
}

export { LedgerService };
