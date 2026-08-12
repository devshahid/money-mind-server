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
  ledgerId: string;
  transactionId: string;
  direction: 'i_paid' | 'they_paid';
  amount: number;
  isSettlement: boolean;
  createdAt: string;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>({
  id: { type: String, required: true, unique: true, index: true },
  ledgerId: { type: String, required: true, index: true },
  transactionId: { type: String, required: true },
  direction: { type: String, enum: ['i_paid', 'they_paid'], required: true },
  amount: { type: Number, required: true, default: 0 },
  isSettlement: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
});

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
