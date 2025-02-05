import express from 'express';
import authHandler from '@middlewares/auth/authHandler';
import { DebtController } from '@controllers/debt.controller';

const debtRoute = express.Router();

const debtController = new DebtController();

debtRoute.post('/add-debt', authHandler.userAccess, debtController.addDebt);

debtRoute.put('/update-debt', authHandler.userAccess, debtController.updateDebt);

debtRoute.delete('/delete-debt/:debtId', authHandler.userAccess, debtController.deleteDebt);

debtRoute.get('/get-debt/:debtId', authHandler.userAccess, debtController.getDebt);

debtRoute.get('/list-debts', authHandler.userAccess, debtController.listDebt);

export { debtRoute };
