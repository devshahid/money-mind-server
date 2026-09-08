/**
 * Ledger Controller
 *
 * Handles HTTP requests for ledger operations
 */

import { Response } from 'express';
import { Types } from 'mongoose';
import { LedgerService } from './ledger.service';
import asyncHandler from '../../shared/utils/asyncHandler';
import { CustomError } from '../../shared/core/ApiError';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';

class LedgerController extends ResponseHandler {
  /**
   * Create a new ledger
   */
  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { partyName, clientId } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const ledger = await service.create(partyName, clientId);
    await this.sendResponse(ledger, res);
  });

  /**
   * Get all ledgers for the user
   */
  list = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const ledgers = await service.getAll();
    await this.sendResponse(ledgers, res);
  });

  /**
   * Get a specific ledger with all its entries
   */
  getById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const ledger = await service.getWithEntries(id);
    if (!ledger) throw new CustomError('Ledger not found', 404);
    await this.sendResponse(ledger, res);
  });

  /**
   * Update a ledger
   */
  update = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const ledger = await service.update(new Types.ObjectId(id), req.body);
    if (!ledger) throw new CustomError('Ledger not found', 404);
    await this.sendResponse(ledger, res);
  });

  /**
   * Delete a ledger
   */
  delete = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    await service.delete(new Types.ObjectId(id));
    await this.sendResponse({ message: 'Ledger deleted successfully' }, res);
  });

  /**
   * Add an entry (link transaction) to a ledger
   */
  addEntry = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { transactionId, direction, amount, entryId, narration, transactionDate } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const entry = await service.addEntry(
      new Types.ObjectId(id),
      transactionId,
      direction,
      amount,
      entryId,
      narration,
      transactionDate
    );
    await this.sendResponse(entry, res);
  });

  /**
   * Remove an entry from a ledger
   */
  removeEntry = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id, entryId } = req.params as { id: string; entryId: string };
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    await service.removeEntry(new Types.ObjectId(id), entryId);
    await this.sendResponse({ message: 'Entry removed successfully' }, res);
  });

  /**
   * Sync ledgers and entries with server
   * Receives local state and returns canonical state
   */
  syncLedgers = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { operations, ledgers, entries, deletedLedgerIds, deletedEntryIds } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const response = Array.isArray(operations)
      ? await service.syncOperations(operations)
      : await service.syncLedgers(
          ledgers || [],
          entries || [],
          deletedLedgerIds || [],
          deletedEntryIds || []
        );
    await this.sendResponse(response, res);
  });

  /**
   * Get all entries for a ledger
   */
  getEntries = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new LedgerService(req.user._id);
    const entries = await service.getEntries(new Types.ObjectId(id));
    await this.sendResponse(entries, res);
  });
}

export { LedgerController };
