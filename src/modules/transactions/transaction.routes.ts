import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { TransactionLogsController } from './transaction.controller';
import {
  validateRequest,
  uploadLogsSchema,
  previewUploadSchema,
  fetchTransactionsSchema,
  bulkUpdateSchema,
  updateTransactionSchema,
} from './validators/transaction.validation';

const transactionLogsRoute = express.Router();

const transactionLogsController = new TransactionLogsController();

/**
 * @openapi
 * /api/v1/transactions/upload-data-from-file:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: Upload transactions from bank statement file
 *     description: Bulk upload transactions parsed from bank statement
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rows
 *               - bankName
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *               bankName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transactions uploaded successfully
 */
transactionLogsRoute.post(
  '/upload-data-from-file',
  authHandler.userAccess,
  validateRequest(uploadLogsSchema, 'body'),
  transactionLogsController.uploadLogsFromFile
);

/**
 * @openapi
 * /api/v1/transactions/preview-upload:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: Preview transactions before upload
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preview data returned
 */
transactionLogsRoute.post(
  '/preview-upload',
  authHandler.userAccess,
  validateRequest(previewUploadSchema, 'body'),
  transactionLogsController.previewUpload
);

/**
 * @openapi
 * /api/v1/transactions/list-transactions:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: List/filter transactions
 *     description: Fetch transactions with filtering, pagination, and search
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: number
 *                 default: 1
 *               limit:
 *                 type: number
 *                 default: 10
 *               category:
 *                 type: string
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *               keyword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transactions list
 */
transactionLogsRoute.post(
  '/list-transactions',
  authHandler.userAccess,
  validateRequest(fetchTransactionsSchema, 'body'),
  transactionLogsController.fetchTransactions
);

/**
 * @openapi
 * /api/v1/transactions/list-upload-keys:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get list of upload keys
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload keys list
 */
transactionLogsRoute.get(
  '/list-upload-keys',
  authHandler.userAccess,
  transactionLogsController.getUploadKeys
);

/**
 * @openapi
 * /api/v1/transactions/bulk-update:
 *   put:
 *     tags:
 *       - Transactions
 *     summary: Bulk update transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions updated
 */
transactionLogsRoute.put(
  '/bulk-update',
  authHandler.userAccess,
  validateRequest(bulkUpdateSchema, 'body'),
  transactionLogsController.bulkUpdate
);

/**
 * @openapi
 * /api/v1/transactions/update/{id}:
 *   put:
 *     tags:
 *       - Transactions
 *     summary: Update single transaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction updated
 */
transactionLogsRoute.put(
  '/update/:id',
  authHandler.userAccess,
  validateRequest(updateTransactionSchema, 'body'),
  transactionLogsController.updateTransactions
);

/**
 * @openapi
 * /api/v1/transactions/list-labels:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get all transaction labels
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Labels list
 */
transactionLogsRoute.get(
  '/list-labels',
  authHandler.userAccess,
  transactionLogsController.listLabels
);

/**
 * @openapi
 * /api/v1/transactions/list-categories:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get all transaction categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories list
 */
transactionLogsRoute.get(
  '/list-categories',
  authHandler.userAccess,
  transactionLogsController.categoryList
);

/**
 * @openapi
 * /api/v1/transactions/delete-all-transactions:
 *   delete:
 *     tags:
 *       - Transactions
 *     summary: Delete all user transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All transactions deleted
 */
transactionLogsRoute.delete(
  '/delete-all-transactions',
  authHandler.userAccess,
  transactionLogsController.deleteAllTransactions
);

/**
 * @openapi
 * /api/v1/transactions/add-cashmemo:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: Add cash memo transaction
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash memo added
 */
transactionLogsRoute.post(
  '/add-cashmemo',
  authHandler.userAccess,
  transactionLogsController.addCashMemo
);

/**
 * @openapi
 * /api/v1/transactions/sync-transactions:
 *   put:
 *     tags:
 *       - Transactions
 *     summary: Sync multiple transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions synced
 */
transactionLogsRoute.put(
  '/sync-transactions',
  authHandler.userAccess,
  transactionLogsController.syncMultipleTransactions
);

export { transactionLogsRoute };
