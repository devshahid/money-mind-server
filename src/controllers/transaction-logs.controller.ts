import { CustomError } from '../core/ApiError';
import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { TransactionLogsService } from '../services/transaction-logs.service';
import { Response } from 'express';

class TransactionLogsController extends ResponseHandler {
  uploadLogsFromFile = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { rows, bankName } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.uploadLogsFromFile(rows, bankName);
    await this.sendResponse(response, res);
  });

  fetchTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
      uploadKey,
      page = 1,
      limit = 10,
      amount,
      dateFrom,
      dateTo,
      bankName,
      transactionType,
      type,
      labels,
      category,
      keyword,
    } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.fetchTransactionLogs(
      Number(page),
      Number(limit),
      amount,
      dateFrom,
      dateTo,
      bankName,
      transactionType,
      type,
      labels,
      category,
      keyword,
      uploadKey as string
    );
    await this.sendResponse(response, res);
  });

  getUploadKeys = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.getUploadKey();
    await this.sendResponse(response, res);
  });

  bulkUpdate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { transactions, uploadKey, bankName } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.updateBulkLogs(transactions, uploadKey, bankName);
    await this.sendResponse(response, res);
  });

  updateTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.updateSingleLog(id, req.body);
    await this.sendResponse(response, res);
  });

  listLabels = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.listLabelsService();
    await this.sendResponse(response, res);
  });

  categoryList = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.listCategoriesService();
    await this.sendResponse(response, res);
  });

  deleteAllTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.deleteAllTransactionsService();
    await this.sendResponse(response, res);
  });

  addCashMemo = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.addCashMemoService(req.body);
    await this.sendResponse(response, res);
  });

  syncMultipleTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { transactions, page, limit } = req.body;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const transactionLogsService = new TransactionLogsService(req.user?._id);
    const response = await transactionLogsService.syncTransactionsWithDB(
      transactions,
      Number(page),
      Number(limit)
    );
    await this.sendResponse(response, res);
  });
}

export { TransactionLogsController };
