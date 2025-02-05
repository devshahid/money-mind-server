import asyncHandler from '@helpers/asyncHandler';
import ResponseHandler from '@helpers/responseHandler';
import { CustomRequest } from '@middlewares/auth/authHandler';
import { ExpenseService } from '@services/expense.service';
import { Response } from 'express';

class ExpenseController extends ResponseHandler {
  createCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryName, itemDetails } = req.body;
    const expenseService = new ExpenseService();
    const result = await expenseService.createCategoryService(
      categoryName,
      itemDetails,
      req.user?._id
    );
    await this.sendResponse(result, res);
  });

  addItemsToCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId, itemDetails } = req.body;
    const expenseService = new ExpenseService();
    const result = await expenseService.addItemsInCategoryService(
      categoryId,
      itemDetails,
      req.user?._id
    );
    await this.sendResponse(result, res);
  });

  removeItemsFromCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId, itemId } = req.body;
    const expenseService = new ExpenseService();
    const result = await expenseService.removeItemsFromCategoryService(
      categoryId,
      itemId,
      req.user?._id
    );
    await this.sendResponse(result, res);
  });

  deleteCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId } = req.params;
    const expenseService = new ExpenseService();
    const result = await expenseService.deleteCategoryService(categoryId, req.user?._id);
    await this.sendResponse(result, res);
  });

  updateCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId, categoryName } = req.body;
    const expenseService = new ExpenseService();
    const result = await expenseService.updateCategoryService(
      categoryId,
      categoryName,
      req.user?._id
    );
    await this.sendResponse(result, res);
  });

  listCategoryItems = asyncHandler(async (req: CustomRequest, res: Response) => {
    const expenseService = new ExpenseService();
    const result = await expenseService.listAllExpenseService(req.user?._id);
    await this.sendResponse(result, res);
  });
}

export { ExpenseController };
