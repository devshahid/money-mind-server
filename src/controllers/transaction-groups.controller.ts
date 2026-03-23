import { CustomError } from '../core/ApiError';
import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { TransactionGroupsService } from '../services/transaction-groups.service';
import { Response } from 'express';

class TransactionGroupsController extends ResponseHandler {
  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { groupName, description } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.createGroup(groupName, description);
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

  removeTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    const { transactionIds } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.removeTransactions(id, transactionIds);
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
    const { groupName, description } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.updateGroup(id, { groupName, description });
    await this.sendResponse(response, res);
  });

  delete = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new TransactionGroupsService(req.user._id);
    const response = await service.deleteGroup(id);
    await this.sendResponse(response, res);
  });
}

export { TransactionGroupsController };
