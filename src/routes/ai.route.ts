import express from 'express';
import authHandler from '../middlewares/auth/authHandler';
import { AIController } from '../controllers/ai.controller';

const aiRoute = express.Router();

const aiController = new AIController();

// Category suggestions
aiRoute.post('/suggest-categories', authHandler.userAccess, aiController.suggestCategories);
aiRoute.post('/apply-suggestions', authHandler.userAccess, aiController.applySuggestions);
aiRoute.post('/reject-suggestions', authHandler.userAccess, aiController.rejectSuggestions);

// Chat with memory
aiRoute.post('/chat', authHandler.userAccess, aiController.chat);
aiRoute.get('/chat-history', authHandler.userAccess, aiController.getChatHistory);
aiRoute.delete('/chat-history/:sessionId?', authHandler.userAccess, aiController.clearChatHistory);

// Financial insights
aiRoute.post('/debt-strategy', authHandler.userAccess, aiController.debtStrategy);
aiRoute.post('/budget-recommendations', authHandler.userAccess, aiController.budgetRecommendations);

export { aiRoute };
