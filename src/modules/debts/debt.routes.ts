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

export { debtRoute };
