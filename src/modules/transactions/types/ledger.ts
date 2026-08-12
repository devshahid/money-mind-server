/**
 * Ledger module types
 */

/**
 * Money direction - who paid
 */
export type MoneyDirection = 'i_paid' | 'they_paid';

/**
 * Ledger entry type
 */
export interface ILedgerEntry {
  id: string;
  ledgerId: string;
  transactionId: string;
  direction: MoneyDirection;
  amount: number;
  isSettlement: boolean;
  createdAt: string;
}

/**
 * Ledger type
 */
export interface ILedger {
  id: string;
  userId: string;
  clientId?: string;
  partyName: string;
  createdAt: string;
  updatedAt: string;
}
