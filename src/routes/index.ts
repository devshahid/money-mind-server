import express from 'express';
import {
  userRoute,
  expenseRoute,
  debtRoute,
  incomeRoute,
  transactionLogsRoute,
  transactionGroupsRoute,
  membersRoute,
  goalsRoute,
  budgetsRoute,
  analyticsRoute,
  aiRoute,
} from '../modules';

const router = express.Router();

router.use('/user', userRoute);

router.use('/expense', expenseRoute);

router.use('/debt', debtRoute);

router.use('/income', incomeRoute);

router.use('/transaction-logs', transactionLogsRoute);

router.use('/transaction-groups', transactionGroupsRoute);

router.use('/members', membersRoute);

router.use('/goals', goalsRoute);

router.use('/budgets', budgetsRoute);

router.use('/analytics', analyticsRoute);

router.use('/ai', aiRoute);

export default router;
