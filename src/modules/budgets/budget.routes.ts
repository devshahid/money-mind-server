import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { BudgetController } from './budget.controller';

const budgetsRoute = express.Router();

const budgetController = new BudgetController();

budgetsRoute.post('/create', authHandler.userAccess, budgetController.create);

budgetsRoute.put('/:budgetId', authHandler.userAccess, budgetController.update);

budgetsRoute.get('/list', authHandler.userAccess, budgetController.list);

budgetsRoute.get('/:budgetId', authHandler.userAccess, budgetController.getById);

budgetsRoute.delete('/:budgetId', authHandler.userAccess, budgetController.delete);

budgetsRoute.post(
  '/:budgetId/calculate-actuals',
  authHandler.userAccess,
  budgetController.calculateActuals
);

budgetsRoute.post('/copy-from-previous', authHandler.userAccess, budgetController.copyFromPrevious);

export { budgetsRoute };
