/**
 * One-time migration: remove the ledger "settlement" concept.
 *
 * Repayments are now handled as ordinary linked transactions (the user creates
 * a transaction, links it to the ledger, and the direction auto-calculates the
 * balance). The old synthetic `isSettlement: true` entries are therefore
 * obsolete and must be removed so they do not double-count against the balance.
 *
 * This script performs three steps against the `ledgerentries` collection:
 *   a) Delete every entry where `isSettlement === true` (legacy settlement rows).
 *   b) For the remaining entries, collapse duplicate (ledgerId, transactionId)
 *      pairs by keeping the earliest by `createdAt` and deleting the rest, so
 *      the new unique compound index can build.
 *   c) `$unset` the `isSettlement` field from all remaining ledger entry docs.
 *
 * IMPORTANT: Run this BEFORE deploying the code that declares the new unique
 * index `{ ledgerId: 1, transactionId: 1 }` on `ledgerEntrySchema`. If duplicate
 * pairs still exist, the unique index will fail to build.
 *
 * Usage (from the money-mind-server directory):
 *   npx ts-node -r dotenv/config src/scripts/migrate-remove-ledger-settlement.ts
 *
 * It relies on the same DB_URL / DB_NAME environment variables the app uses.
 */

import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

interface LedgerEntryDoc {
  _id: mongoose.Types.ObjectId;
  ledgerId: string;
  transactionId: string;
  createdAt?: string;
  isSettlement?: boolean;
}

const run = async (): Promise<void> => {
  const DB_URI = `${process.env.DB_URL}/${process.env.DB_NAME}`;
  if (!process.env.DB_URL || !process.env.DB_NAME) {
    throw new Error('DB_URL and DB_NAME environment variables are required.');
  }

  console.info(`[migrate-remove-ledger-settlement] Connecting to ${DB_URI} ...`);
  await mongoose.connect(DB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.info('[migrate-remove-ledger-settlement] Connected.');

  if (DRY_RUN) {
    console.info('[migrate-remove-ledger-settlement] DRY RUN — no writes will be performed.');
  }

  const collection = mongoose.connection.collection<LedgerEntryDoc>('ledgerentries');

  // --- Step (a): delete legacy settlement rows -----------------------------
  const settlementFilter = { isSettlement: true };
  const settlementCount = await collection.countDocuments(settlementFilter);
  console.info(
    `[migrate-remove-ledger-settlement] Step a: found ${settlementCount} settlement entr${
      settlementCount === 1 ? 'y' : 'ies'
    } (isSettlement === true).`
  );
  if (!DRY_RUN && settlementCount > 0) {
    const res = await collection.deleteMany(settlementFilter);
    console.info(
      `[migrate-remove-ledger-settlement] Step a: deleted ${res.deletedCount} settlement entries.`
    );
  }

  // --- Step (b): collapse duplicate (ledgerId, transactionId) pairs ---------
  // Keep the earliest by createdAt; delete the rest.
  const remaining = await collection
    .find({}, { projection: { ledgerId: 1, transactionId: 1, createdAt: 1 } })
    .toArray();

  const groups = new Map<string, LedgerEntryDoc[]>();
  for (const entry of remaining) {
    const key = `${entry.ledgerId}::${entry.transactionId}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const idsToDelete: mongoose.Types.ObjectId[] = [];
  let duplicateGroups = 0;
  for (const bucket of groups.values()) {
    if (bucket.length <= 1) continue;
    duplicateGroups++;
    // Sort ascending by createdAt (fallback to ObjectId order for missing dates).
    bucket.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (at !== bt) return at - bt;
      return a._id.toString().localeCompare(b._id.toString());
    });
    // Keep the first (earliest); mark the rest for deletion.
    for (let i = 1; i < bucket.length; i++) {
      idsToDelete.push(bucket[i]._id);
    }
  }

  console.info(
    `[migrate-remove-ledger-settlement] Step b: found ${duplicateGroups} duplicate (ledgerId, transactionId) group(s), ` +
      `marking ${idsToDelete.length} redundant entr${idsToDelete.length === 1 ? 'y' : 'ies'} for deletion.`
  );
  if (!DRY_RUN && idsToDelete.length > 0) {
    const res = await collection.deleteMany({ _id: { $in: idsToDelete } });
    console.info(
      `[migrate-remove-ledger-settlement] Step b: deleted ${res.deletedCount} duplicate entries.`
    );
  }

  // --- Step (c): unset the isSettlement field from all docs -----------------
  const withFieldFilter = { isSettlement: { $exists: true } };
  const withFieldCount = await collection.countDocuments(withFieldFilter);
  console.info(
    `[migrate-remove-ledger-settlement] Step c: ${withFieldCount} entr${
      withFieldCount === 1 ? 'y' : 'ies'
    } still carry an isSettlement field.`
  );
  if (!DRY_RUN && withFieldCount > 0) {
    const res = await collection.updateMany(withFieldFilter, { $unset: { isSettlement: '' } });
    console.info(
      `[migrate-remove-ledger-settlement] Step c: unset isSettlement on ${res.modifiedCount} entries.`
    );
  }

  console.info('[migrate-remove-ledger-settlement] Done.');
  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-remove-ledger-settlement] FAILED:', err);
    void mongoose.disconnect().finally(() => process.exit(1));
  });
