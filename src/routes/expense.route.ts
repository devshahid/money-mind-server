import express from 'express';
import authHandler from '@middlewares/auth/authHandler';
import { ExpenseController } from '@controllers/expense.controller';

const expenseRoute = express.Router();

const expenseController = new ExpenseController();

expenseRoute.post('/create-category', authHandler.userAccess, expenseController.createCategory);

expenseRoute.post('/add-items', authHandler.userAccess, expenseController.addItemsToCategory);

expenseRoute.delete(
  '/remove-items',
  authHandler.userAccess,
  expenseController.removeItemsFromCategory
);

expenseRoute.delete(
  '/delete-category/:categoryId',
  authHandler.userAccess,
  expenseController.deleteCategory
);

expenseRoute.put('/update-category', authHandler.userAccess, expenseController.updateCategory);

expenseRoute.get('/list-items', authHandler.userAccess, expenseController.listCategoryItems);

export { expenseRoute };
