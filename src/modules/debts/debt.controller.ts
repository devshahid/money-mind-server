import asyncHandler from '../../shared/utils/asyncHandler';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';
import { DebtService } from './debt.service';
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
    const response = await debtService.getDebtService(debtId as string, req.user?._id);
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
    const response = await debtService.removeDebtService(debtId as string, req.user?._id);
    await this.sendResponse(response, res);
  });

  recordPayment = asyncHandler(async (req: CustomRequest, res: Response) => {
    const paymentData = req.body;
    const debtService = new DebtService();
    const response = await debtService.recordPaymentService(paymentData, req.user?._id);
    await this.sendResponse(response, res);
  });

  getPaymentHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getPaymentHistoryService(debtId as string, req.user?._id);
    await this.sendResponse(response, res);
  });

  getPayoffProjection = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getPayoffProjectionService(debtId as string, req.user?._id);
    await this.sendResponse(response, res);
  });

  getDebtSummary = asyncHandler(async (req: CustomRequest, res: Response) => {
    const debtService = new DebtService();
    const response = await debtService.getDebtSummaryService(req.user?._id);
    await this.sendResponse(response, res);
  });

  getDebtStrategy = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { monthlyIncome, monthlyExpenses } = req.query;
    const debtService = new DebtService();
    const response = await debtService.getDebtStrategyService(
      req.user?._id,
      monthlyIncome ? Number(monthlyIncome) : undefined,
      monthlyExpenses ? Number(monthlyExpenses) : undefined
    );
    await this.sendResponse(response, res);
  });

  getDetailedDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getDetailedDebtService(debtId as string, req.user?._id);
    await this.sendResponse(response, res);
  });

  generateRepaymentSchedule = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.generateRepaymentScheduleService(
      debtId as string,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });

  importRepaymentSchedule = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const { scheduleData } = req.body;
    const debtService = new DebtService();
    const response = await debtService.importRepaymentScheduleService(
      debtId as string,
      scheduleData,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });

  getRepaymentSchedule = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getRepaymentScheduleService(debtId as string, req.user?._id);
    await this.sendResponse(response, res);
  });

  linkTransactionToDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const { transactionId, linkType, confidence, notes } = req.body;
    const debtService = new DebtService();
    const response = await debtService.linkTransactionToDebtService(
      debtId as string,
      transactionId,
      linkType,
      req.user?._id,
      confidence,
      notes
    );
    await this.sendResponse(response, res);
  });

  unlinkTransactionFromDebt = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId, transactionId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.unlinkTransactionFromDebtService(
      debtId as string,
      transactionId as string,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });

  getLinkedTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId } = req.params;
    const debtService = new DebtService();
    const response = await debtService.getLinkedTransactionsService(
      debtId as string,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });

  updateScheduleItem = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { debtId, month } = req.params;
    const updates = req.body;
    const debtService = new DebtService();
    const response = await debtService.updateScheduleItemService(
      debtId as string,
      Number(month),
      updates,
      req.user?._id
    );
    await this.sendResponse(response, res);
  });
}

export { DebtController };
