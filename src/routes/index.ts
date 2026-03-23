import express from 'express';
import { userRoute } from './user.route';
import { expenseRoute } from './expense.route';
import { debtRoute } from './debt.route';
import { incomeRoute } from './income.route';
import { transactionLogsRoute } from './transaction-logs.route';
import { transactionGroupsRoute } from './transaction-groups.route';
import { goalsRoute } from './goals.route';
import { budgetsRoute } from './budgets.route';
import { analyticsRoute } from './analytics.route';
import { aiRoute } from './ai.route';
const router = express.Router();

router.use('/user', userRoute);

router.use('/expense', expenseRoute);

router.use('/debt', debtRoute);

router.use('/income', incomeRoute);

router.use('/transaction-logs', transactionLogsRoute);

router.use('/transaction-groups', transactionGroupsRoute);

router.use('/goals', goalsRoute);

router.use('/budgets', budgetsRoute);

router.use('/analytics', analyticsRoute);

router.use('/ai', aiRoute);

export default router;
