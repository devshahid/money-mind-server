import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { IncomeService } from '../services/income.services';
import { Response } from 'express';

class IncomeController extends ResponseHandler {
  addIncome = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { incomeDetails } = req.body;
    const incomeService = new IncomeService();
    const response = await incomeService.addIncomeService(incomeDetails, req.user?._id);
    await this.sendResponse(response, res);
  });

  getIncome = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { incomeId } = req.params;
    const incomeService = new IncomeService();
    const response = await incomeService.getIncomeService(incomeId, req.user?._id);
    await this.sendResponse(response, res);
  });

  listIncome = asyncHandler(async (req: CustomRequest, res: Response) => {
    const incomeService = new IncomeService();
    const response = await incomeService.listIncomeService(req.user?._id);
    await this.sendResponse(response, res);
  });

  updateIncome = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { incomeId, incomeDetails } = req.body;
    const incomeService = new IncomeService();
    const response = await incomeService.updateIncomeService(
      incomeId,
      incomeDetails,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });

  deleteIncome = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { incomeId } = req.params;
    const incomeService = new IncomeService();
    const response = await incomeService.deleteIncomeService(incomeId, req.user?._id);
    await this.sendResponse(response, res);
  });
}

export { IncomeController };
