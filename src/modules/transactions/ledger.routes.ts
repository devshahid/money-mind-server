/**
 * Ledger Routes
 *
 * HTTP endpoints for ledger operations
 */

import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { LedgerController } from './ledger.controller';

const ledgerRoute = express.Router();
const ledgerController = new LedgerController();

/**
 * Sync ledgers with server - must be before :id routes
 */
ledgerRoute.put('/sync', authHandler.userAccess, ledgerController.syncLedgers);

/**
 * List all ledgers
 */
ledgerRoute.get('/', authHandler.userAccess, ledgerController.list);

/**
 * Create a new ledger
 */
ledgerRoute.post('/', authHandler.userAccess, ledgerController.create);

/**
 * Get ledger details with entries
 */
ledgerRoute.get('/:id', authHandler.userAccess, ledgerController.getById);

/**
 * Update a ledger
 */
ledgerRoute.put('/:id', authHandler.userAccess, ledgerController.update);

/**
 * Delete a ledger
 */
ledgerRoute.delete('/:id', authHandler.userAccess, ledgerController.delete);

/**
 * Add an entry to a ledger
 */
ledgerRoute.post('/:id/entries', authHandler.userAccess, ledgerController.addEntry);

/**
 * Get entries for a ledger
 */
ledgerRoute.get('/:id/entries', authHandler.userAccess, ledgerController.getEntries);

/**
 * Remove an entry from a ledger
 */
ledgerRoute.delete('/:id/entries/:entryId', authHandler.userAccess, ledgerController.removeEntry);

export { ledgerRoute };
