import express from 'express';
import {
  userRoute,
  expenseRoute,
  debtRoute,
  incomeRoute,
  transactionLogsRoute,
  transactionGroupsRoute,
  ledgerRoute,
  membersRoute,
  goalsRoute,
  budgetsRoute,
  analyticsRoute,
  aiRoute,
  aiConfigRoute,
} from '../modules';

const router = express.Router();

router.use('/user', userRoute);

router.use('/expense', expenseRoute);

router.use('/debt', debtRoute);

router.use('/income', incomeRoute);

router.use('/transaction-logs', transactionLogsRoute);

router.use('/transaction-groups', transactionGroupsRoute);

router.use('/ledgers', ledgerRoute);

router.use('/members', membersRoute);

router.use('/goals', goalsRoute);

router.use('/budgets', budgetsRoute);

router.use('/analytics', analyticsRoute);

router.use('/ai', aiRoute);

router.use('/ai', aiConfigRoute);

export default router;
