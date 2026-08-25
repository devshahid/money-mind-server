/**
 * One-time migration: backfill `userId` on existing ledger entries.
 *
 * `LedgerEntry` historically had no `userId` field — entry ownership was
 * derived at query time from the parent ledger's `clientId`. The schema now
 * declares `userId: { required: true }` as a defense-in-depth backstop (see
 * `modules/transactions/models/ledger.model.ts`). Existing rows created before
 * that change do not carry a `userId` and would fail validation the next time
 * they are saved.
 *
 * This script resolves each entry's owner from its parent ledger and writes it
 * back:
 *   - An entry's `ledgerId` equals the parent ledger's `clientId`.
 *   - The parent ledger carries the authoritative `userId`.
 *   - So for every entry missing `userId`, look up the ledger whose
 *     `clientId === entry.ledgerId` and set `entry.userId = ledger.userId`.
 *
 * Entries whose `ledgerId` matches no ledger are ORPHANS: they cannot be
 * attributed to a user. They are reported (count + a sample of ids) and left
 * untouched — the script does not crash on them. Investigate/clean them
 * separately.
 *
 * IMPORTANT — deploy ordering:
 *   Run this migration BEFORE deploying the code that declares
 *   `userId: { required: true }` on `ledgerEntrySchema`. If legacy rows still
 *   lack `userId` when that schema is live, any save touching them fails
 *   validation. Run it alongside the existing settlement migration
 *   (`migrate-remove-ledger-settlement.ts`); order relative to that one does
 *   not matter, but both must run before the new schema/index changes ship.
 *
 * Usage (from the money-mind-server directory):
 *   npx ts-node -r dotenv/config src/scripts/migrate-backfill-ledger-entry-userid.ts
 *   npx ts-node -r dotenv/config src/scripts/migrate-backfill-ledger-entry-userid.ts --dry-run
 *
 * It relies on the same DB_URL / DB_NAME environment variables the app uses.
 */

import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

// A sample of orphan ids to print (avoid flooding logs on large datasets).
const ORPHAN_SAMPLE_SIZE = 20;

interface LedgerEntryDoc {
  _id: mongoose.Types.ObjectId;
  id?: string;
  ledgerId: string;
  userId?: string;
}

interface LedgerDoc {
  _id: mongoose.Types.ObjectId;
  clientId: string;
  userId: string;
}

const run = async (): Promise<void> => {
  const DB_URI = `${process.env.DB_URL}/${process.env.DB_NAME}`;
  if (!process.env.DB_URL || !process.env.DB_NAME) {
    throw new Error('DB_URL and DB_NAME environment variables are required.');
  }

  console.info(`[migrate-backfill-ledger-entry-userid] Connecting to ${DB_URI} ...`);
  await mongoose.connect(DB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.info('[migrate-backfill-ledger-entry-userid] Connected.');

  if (DRY_RUN) {
    console.info('[migrate-backfill-ledger-entry-userid] DRY RUN — no writes will be performed.');
  }

  const entriesCol = mongoose.connection.collection<LedgerEntryDoc>('ledgerentries');
  const ledgersCol = mongoose.connection.collection<LedgerDoc>('ledgers');

  const totalEntries = await entriesCol.countDocuments({});
  console.info(`[migrate-backfill-ledger-entry-userid] Total ledger entries: ${totalEntries}.`);

  // Entries missing a userId are the ones needing backfill. Treat both an
  // absent field and an empty/null value as "missing". Typed as a loose Mongo
  // filter: the driver's typed Filter<> rejects `userId: null` for an optional
  // string field, but at runtime we genuinely want to match null/absent rows.
  const missingFilter: mongoose.mongo.Filter<LedgerEntryDoc> = {
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }],
  } as mongoose.mongo.Filter<LedgerEntryDoc>;
  const missing = await entriesCol.find(missingFilter).toArray();
  console.info(`[migrate-backfill-ledger-entry-userid] Entries missing userId: ${missing.length}.`);

  if (missing.length === 0) {
    console.info('[migrate-backfill-ledger-entry-userid] Nothing to backfill. Done.');
    await mongoose.disconnect();
    return;
  }

  // Build a clientId -> userId map from all ledgers (single scan).
  const ledgers = await ledgersCol.find({}, { projection: { clientId: 1, userId: 1 } }).toArray();
  const clientIdToUserId = new Map<string, string>();
  for (const ledger of ledgers) {
    if (ledger.clientId) clientIdToUserId.set(ledger.clientId, String(ledger.userId));
  }

  const bulkOps: Array<{
    updateOne: {
      filter: { _id: mongoose.Types.ObjectId };
      update: { $set: { userId: string } };
    };
  }> = [];
  const orphanIds: string[] = [];

  for (const entry of missing) {
    const ownerUserId = clientIdToUserId.get(entry.ledgerId);
    if (!ownerUserId) {
      orphanIds.push(entry.id ?? entry._id.toString());
      continue;
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { userId: ownerUserId } },
      },
    });
  }

  console.info(
    `[migrate-backfill-ledger-entry-userid] Resolvable (will backfill): ${bulkOps.length}.`
  );
  console.info(
    `[migrate-backfill-ledger-entry-userid] Orphans (no matching ledger, left untouched): ${orphanIds.length}.`
  );
  if (orphanIds.length > 0) {
    const sample = orphanIds.slice(0, ORPHAN_SAMPLE_SIZE);
    console.warn(
      `[migrate-backfill-ledger-entry-userid] Orphan entry id sample (${sample.length} of ${orphanIds.length}): ${sample.join(', ')}`
    );
  }

  if (!DRY_RUN && bulkOps.length > 0) {
    const res = await entriesCol.bulkWrite(bulkOps, { ordered: false });
    console.info(
      `[migrate-backfill-ledger-entry-userid] Backfilled userId on ${res.modifiedCount} entr${
        res.modifiedCount === 1 ? 'y' : 'ies'
      }.`
    );
  }

  console.info('[migrate-backfill-ledger-entry-userid] Done.');
  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-backfill-ledger-entry-userid] FAILED:', err);
    void mongoose.disconnect().finally(() => process.exit(1));
  });
