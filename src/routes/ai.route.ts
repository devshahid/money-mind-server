import express from 'express';
import authHandler from '../middlewares/auth/authHandler';
import { AIController } from '../controllers/ai.controller';

const aiRoute = express.Router();

const aiController = new AIController();

aiRoute.post(
  '/categorize-transactions',
  authHandler.userAccess,
  aiController.categorizeTransactions
);

aiRoute.post('/suggest-groups', authHandler.userAccess, aiController.suggestGroups);

aiRoute.post('/debt-strategy', authHandler.userAccess, aiController.debtStrategy);

aiRoute.post('/goal-advice', authHandler.userAccess, aiController.goalAdvice);

aiRoute.post('/budget-recommendations', authHandler.userAccess, aiController.budgetRecommendations);

aiRoute.post('/chat', authHandler.userAccess, aiController.chat);

export { aiRoute };
