import express from 'express';
import { userRoute } from './user.route';
import { expenseRoute } from './expense.route';
import { debtRoute } from './debt.route';
import { incomeRoute } from './income.route';
const router = express.Router();

router.use('/user', userRoute);

router.use('/expense', expenseRoute);

router.use('/debt', debtRoute);

router.use('/income', incomeRoute);

export default router;
