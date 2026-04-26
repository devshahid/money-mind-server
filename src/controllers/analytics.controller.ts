import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../core/ApiError';

class AnalyticsController extends ResponseHandler {
  incomeVsExpense = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    // TODO: Implement in task 9.2
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  categoryBreakdown = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  monthlyTrend = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  savingsProgress = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  debtProgress = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  budgetVsActual = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  topSpending = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });
}

export { AnalyticsController };
