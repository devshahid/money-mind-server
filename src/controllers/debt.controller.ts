import asyncHandler from '@helpers/asyncHandler';
import ResponseHandler from '@helpers/responseHandler';
import { CustomRequest } from '@middlewares/auth/authHandler';
import { DebtService } from '@services/debt.service';
import { Response } from 'express';

class DebtController extends ResponseHandler {
  addDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtDetails } = req.body;
    const debtService = new DebtService();
    const response = await debtService.addDebtService(debtDetails, req.user?._id);
    await this.sendResponse(response, res);
  });

  updateDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId, debtDetails } = req.body;
    const debtService = new DebtService();
    const response = await debtService.updateDebtService(debtId, debtDetails, req.user?._id);
    await this.sendResponse(response, res);
  });

  getDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getDebtService(debtId, req.user?._id);
    await this.sendResponse(response, res);
  });

  listDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const debtService = new DebtService();
    const response = await debtService.listDebtService(req.user?._id);
    await this.sendResponse(response, res);
  });

  deleteDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.removeDebtService(debtId, req.user?._id);
    await this.sendResponse(response, res);
  });
}

export { DebtController };
