import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { AnalyticsController } from './analytics.controller';

const analyticsRoute = express.Router();

const analyticsController = new AnalyticsController();

analyticsRoute.get(
  '/income-vs-expense',
  authHandler.userAccess,
  analyticsController.incomeVsExpense
);

analyticsRoute.get(
  '/category-breakdown',
  authHandler.userAccess,
  analyticsController.categoryBreakdown
);

analyticsRoute.get('/monthly-trend', authHandler.userAccess, analyticsController.monthlyTrend);

analyticsRoute.get(
  '/savings-progress',
  authHandler.userAccess,
  analyticsController.savingsProgress
);

analyticsRoute.get('/debt-progress', authHandler.userAccess, analyticsController.debtProgress);

analyticsRoute.get('/budget-vs-actual', authHandler.userAccess, analyticsController.budgetVsActual);

analyticsRoute.get('/top-spending', authHandler.userAccess, analyticsController.topSpending);

export { analyticsRoute };
