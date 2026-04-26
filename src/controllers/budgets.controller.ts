import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../core/ApiError';

class BudgetController extends ResponseHandler {
  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    // TODO: Implement in task 7.2
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  update = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  list = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  getById = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  delete = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  calculateActuals = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });

  copyFromPrevious = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    await this.sendResponse({ message: 'Not implemented yet' }, res);
  });
}

export { BudgetController };
