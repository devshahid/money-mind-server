import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { TransactionGroupsController } from './transaction-group.controller';

const transactionGroupsRoute = express.Router();

const transactionGroupsController = new TransactionGroupsController();

transactionGroupsRoute.post('/create', authHandler.userAccess, transactionGroupsController.create);

transactionGroupsRoute.get('/list', authHandler.userAccess, transactionGroupsController.list);

transactionGroupsRoute.get('/:id', authHandler.userAccess, transactionGroupsController.getById);

transactionGroupsRoute.put(
  '/update/:id',
  authHandler.userAccess,
  transactionGroupsController.update
);

transactionGroupsRoute.delete(
  '/delete/:id',
  authHandler.userAccess,
  transactionGroupsController.delete
);

transactionGroupsRoute.put(
  '/:id/add-transactions',
  authHandler.userAccess,
  transactionGroupsController.addTransactions
);

transactionGroupsRoute.put(
  '/:id/remove-transaction',
  authHandler.userAccess,
  transactionGroupsController.removeTransaction
);

transactionGroupsRoute.put('/sync', authHandler.userAccess, transactionGroupsController.syncGroups);

export { transactionGroupsRoute };
