import express from 'express';
import authHandler from '@middlewares/auth/authHandler';
import { IncomeController } from '@controllers/income.controller';

const incomeRoute = express.Router();

const incomeController = new IncomeController();

incomeRoute.post('/add-income', authHandler.userAccess, incomeController.addIncome);

incomeRoute.put('/update-income', authHandler.userAccess, incomeController.updateIncome);

incomeRoute.delete(
  '/delete-income/:incomeId',
  authHandler.userAccess,
  incomeController.deleteIncome
);

incomeRoute.get('/get-income/:incomeId', authHandler.userAccess, incomeController.getIncome);

incomeRoute.get('/list-income', authHandler.userAccess, incomeController.listIncome);

export { incomeRoute };
