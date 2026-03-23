import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../core/ApiError';

class AIController extends ResponseHandler {
  categorizeTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    // TODO: Implement in task 10.4
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  suggestGroups = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  debtStrategy = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  goalAdvice = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  budgetRecommendations = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  chat = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });
}

export { AIController };
