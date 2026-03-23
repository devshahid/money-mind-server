import express from 'express';
import authHandler from '../middlewares/auth/authHandler';
import { TransactionGroupsController } from '../controllers/transaction-groups.controller';

const transactionGroupsRoute = express.Router();

const transactionGroupsController = new TransactionGroupsController();

transactionGroupsRoute.post('/create', authHandler.userAccess, transactionGroupsController.create);

transactionGroupsRoute.put(
  '/:id/add-transactions',
  authHandler.userAccess,
  transactionGroupsController.addTransactions
);

transactionGroupsRoute.put(
  '/:id/remove-transactions',
  authHandler.userAccess,
  transactionGroupsController.removeTransactions
);

transactionGroupsRoute.get('/list', authHandler.userAccess, transactionGroupsController.list);

transactionGroupsRoute.get('/:id', authHandler.userAccess, transactionGroupsController.getById);

transactionGroupsRoute.put('/:id', authHandler.userAccess, transactionGroupsController.update);

transactionGroupsRoute.delete('/:id', authHandler.userAccess, transactionGroupsController.delete);

export { transactionGroupsRoute };
