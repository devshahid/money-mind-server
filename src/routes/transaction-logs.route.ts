import express from 'express';
import authHandler from '../middlewares/auth/authHandler';
import { TransactionLogsController } from '../controllers/transaction-logs.controller';

const transactionLogsRoute = express.Router();

const transactionLogsController = new TransactionLogsController();

transactionLogsRoute.post(
  '/upload-data-from-file',
  authHandler.userAccess,
  transactionLogsController.uploadLogsFromFile
);

transactionLogsRoute.post(
  '/list-transactions',
  authHandler.userAccess,
  transactionLogsController.fetchTransactions
);

transactionLogsRoute.get(
  '/list-upload-keys',
  authHandler.userAccess,
  transactionLogsController.getUploadKeys
);

transactionLogsRoute.put(
  '/bulk-update',
  authHandler.userAccess,
  transactionLogsController.bulkUpdate
);

transactionLogsRoute.put(
  '/update/:id',
  authHandler.userAccess,
  transactionLogsController.updateTransactions
);

transactionLogsRoute.get(
  '/list-labels',
  authHandler.userAccess,
  transactionLogsController.listLabels
);

transactionLogsRoute.get(
  '/list-categories',
  authHandler.userAccess,
  transactionLogsController.categoryList
);

transactionLogsRoute.delete(
  '/delete-all-transactions',
  authHandler.userAccess,
  transactionLogsController.deleteAllTransactions
);

transactionLogsRoute.post(
  '/add-cashmemo',
  authHandler.userAccess,
  transactionLogsController.addCashMemo
);

transactionLogsRoute.put(
  '/sync-transactions',
  authHandler.userAccess,
  transactionLogsController.syncMultipleTransactions
);

export { transactionLogsRoute };
