import { CustomError } from '../core/ApiError';
import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { TransactionGroupsService } from '../services/transaction-groups.service';
import { Response } from 'express';

class TransactionGroupsController extends ResponseHandler {
  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const {
      clientId,
      name,
      involvedParty,
      members,
      notes,
      transactionIds,
      splitType,
      splitConfig,
    } = req.body;
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.createGroup({
      clientId,
      name,
      involvedParty,
      members,
      notes,
      transactionIds,
      splitType,
      splitConfig,
    });
    await this.sendResponse(response, res);
  });

  list = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.listGroups();
    await this.sendResponse(response, res);
  });

  getById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.getGroup(id);
    await this.sendResponse(response, res);
  });

  update = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const { name, involvedParty, members, notes, transactionIds, splitType, splitConfig } =
      req.body;
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.updateGroup(id, {
      name,
      involvedParty,
      members,
      notes,
      transactionIds,
      splitType,
      splitConfig,
    });
    await this.sendResponse(response, res);
  });

  delete = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.deleteGroup(id);
    await this.sendResponse(response, res);
  });

  addTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    const { transactionIds } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.addTransactions(id, transactionIds);
    await this.sendResponse(response, res);
  });

  removeTransaction = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    const { transactionId } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.removeTransaction(id, transactionId);
    await this.sendResponse(response, res);
  });

  syncGroups = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { groups, deletedClientIds } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.syncGroups(groups, deletedClientIds || []);
    await this.sendResponse(response, res);
  });
}

export { TransactionGroupsController };
