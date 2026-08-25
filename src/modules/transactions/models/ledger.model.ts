/**
 * Ledger Model
 *
 * Represents a ledger tracking financial relationship between user and a party
 */

import { Schema, model, Document } from 'mongoose';

/**
 * Ledger Entry - A transaction linked to a ledger with a specific direction
 */
export interface ILedgerEntry extends Document {
  id: string;
  // Owner of the entry. Defense-in-depth backstop so entry queries can filter
  // directly by user instead of relying solely on re-deriving ownership through
  // the parent ledger's clientId (see the sync-path IDOR that motivated this).
  userId: string;
  ledgerId: string;
  transactionId: string;
  direction: 'i_paid' | 'they_paid';
  amount: number;
  createdAt: string;
  // Snapshot of the linked transaction captured at link time.
  narration?: string;
  transactionDate?: string;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>({
  id: { type: String, required: true, unique: true, index: true },
  // MIGRATION DEPENDENCY: existing rows created before this field was added do
  // not carry a userId. The backfill migration
  // `scripts/migrate-backfill-ledger-entry-userid.ts` MUST run BEFORE deploying
  // this `required: true` schema (it resolves each entry's userId from its
  // parent ledger), otherwise legacy rows fail validation on save.
  userId: { type: String, required: true, index: true },
  ledgerId: { type: String, required: true, index: true },
  transactionId: { type: String, required: true },
  direction: { type: String, enum: ['i_paid', 'they_paid'], required: true },
  amount: { type: Number, required: true, default: 0 },
  createdAt: { type: String, required: true },
  narration: { type: String },
  transactionDate: { type: String },
});

// Hard backstop for duplicate-prevention: a given transaction may be linked to
// a ledger only ONCE. Uniqueness is scoped to (ledgerId, transactionId), so the
// same transaction can still be linked to different ledgers.
// NOTE: Existing data may contain legacy settlement rows and/or duplicate
// (ledgerId, transactionId) pairs. Those MUST be cleaned up before this unique
// index can build — run the one-time migration script
// `scripts/migrate-remove-ledger-settlement.ts` (see that file) prior to
// deploying this change.
ledgerEntrySchema.index({ ledgerId: 1, transactionId: 1 }, { unique: true });

/**
 * Ledger - Tracks financial balance between user and one party
 */
export interface ILedger extends Document {
  userId: string;
  clientId: string; // Generated on client for offline sync
  partyName: string;
  createdAt: string;
  updatedAt: string;
}

const ledgerSchema = new Schema<ILedger>({
  userId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, sparse: true }, // For offline-first sync
  partyName: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

ledgerSchema.index({ userId: 1, clientId: 1 }, { sparse: true, unique: true });

const Ledger = model<ILedger>('Ledger', ledgerSchema);
const LedgerEntry = model<ILedgerEntry>('LedgerEntry', ledgerEntrySchema);

export { Ledger, LedgerEntry };
