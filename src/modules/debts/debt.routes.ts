import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { DebtController } from './debt.controller';
import { validateRequest } from './validators';
import {
  recordPaymentSchema,
  addDebtSchema,
  updateDebtSchema,
  debtIdParamSchema,
} from './validators/debt.validation';

const debtRoute = express.Router();

const debtController = new DebtController();

debtRoute.post(
  '/add-debt',
  authHandler.userAccess,
  validateRequest(addDebtSchema),
  debtController.addDebt
);

debtRoute.put(
  '/update-debt',
  authHandler.userAccess,
  validateRequest(updateDebtSchema),
  debtController.updateDebt
);

debtRoute.delete(
  '/delete-debt/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.deleteDebt
);

debtRoute.get(
  '/get-debt/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getDebt
);

debtRoute.get('/list-debts', authHandler.userAccess, debtController.listDebt);

debtRoute.post(
  '/record-payment',
  authHandler.userAccess,
  validateRequest(recordPaymentSchema),
  debtController.recordPayment
);

debtRoute.get(
  '/payment-history/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getPaymentHistory
);

debtRoute.get(
  '/payoff-projection/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getPayoffProjection
);

debtRoute.get('/summary', authHandler.userAccess, debtController.getDebtSummary);

debtRoute.get('/strategy', authHandler.userAccess, debtController.getDebtStrategy);

debtRoute.get(
  '/detailed/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getDetailedDebt
);

// Repayment Schedule Routes
debtRoute.post(
  '/schedule/generate/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.generateRepaymentSchedule
);

debtRoute.post(
  '/schedule/import/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.importRepaymentSchedule
);

debtRoute.get(
  '/schedule/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getRepaymentSchedule
);

debtRoute.put(
  '/schedule/:debtId/:month',
  authHandler.userAccess,
  debtController.updateScheduleItem
);

// Transaction Linking Routes
debtRoute.post(
  '/link-transaction/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.linkTransactionToDebt
);

debtRoute.delete(
  '/unlink-transaction/:debtId/:transactionId',
  authHandler.userAccess,
  debtController.unlinkTransactionFromDebt
);

debtRoute.get(
  '/linked-transactions/:debtId',
  authHandler.userAccess,
  validateRequest(debtIdParamSchema, 'params'),
  debtController.getLinkedTransactions
);

export { debtRoute };
