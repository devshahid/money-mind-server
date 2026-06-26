import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { AIController } from './ai.controller';
import {
  validateRequest,
  suggestCategoriesSchema,
  applySuggestionsSchema,
  rejectSuggestionsSchema,
  chatRequestSchema,
  getChatHistorySchema,
  debtStrategySchema,
  budgetRecommendationsSchema,
} from './validators/ai.validation';

const aiRoute = express.Router();

const aiController = new AIController();

/**
 * @openapi
 * /api/v1/ai/suggest-categories:
 *   post:
 *     tags:
 *       - AI
 *     summary: Get AI-powered category suggestions for transactions
 *     description: |
 *       Analyzes transaction narrations and amounts using LangChain + GitHub Copilot/OpenAI
 *       to suggest appropriate categories. Does NOT auto-apply suggestions.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   transactionIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Specific transaction IDs to categorize
 *               - type: object
 *                 properties:
 *                   all:
 *                     type: boolean
 *                     description: Categorize all uncategorized transactions
 *           examples:
 *             specificTransactions:
 *               value:
 *                 transactionIds: ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
 *             allUncategorized:
 *               value:
 *                 all: true
 *     responses:
 *       200:
 *         description: Category suggestions generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 output:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategorySuggestion'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
aiRoute.post(
  '/suggest-categories',
  authHandler.userAccess,
  validateRequest(suggestCategoriesSchema, 'body'),
  aiController.suggestCategories
);

/**
 * @openapi
 * /api/v1/ai/apply-suggestions:
 *   post:
 *     tags:
 *       - AI
 *     summary: Apply user-approved AI category suggestions
 *     description: Bulk apply category suggestions that the user has reviewed and approved
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - suggestions
 *             properties:
 *               suggestions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                     suggestedCategory:
 *                       type: string
 *           example:
 *             suggestions:
 *               - transactionId: "507f1f77bcf86cd799439011"
 *                 suggestedCategory: "Food"
 *               - transactionId: "507f191e810c19729de860ea"
 *                 suggestedCategory: "Fuel"
 *     responses:
 *       200:
 *         description: Suggestions applied successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
aiRoute.post(
  '/apply-suggestions',
  authHandler.userAccess,
  validateRequest(applySuggestionsSchema, 'body'),
  aiController.applySuggestions
);

/**
 * @openapi
 * /api/v1/ai/reject-suggestions:
 *   post:
 *     tags:
 *       - AI
 *     summary: Reject AI category suggestions
 *     description: Mark transactions as having rejected AI suggestions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionIds
 *             properties:
 *               transactionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             transactionIds: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       200:
 *         description: Suggestions rejected successfully
 */
aiRoute.post(
  '/reject-suggestions',
  authHandler.userAccess,
  validateRequest(rejectSuggestionsSchema, 'body'),
  aiController.rejectSuggestions
);

/**
 * @openapi
 * /api/v1/ai/chat:
 *   post:
 *     tags:
 *       - AI
 *     summary: Chat with AI financial assistant
 *     description: |
 *       Conversational AI with session-based memory and financial context awareness.
 *       Provides personalized advice based on user's financial data.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             message: "How can I reduce my monthly expenses?"
 *             sessionId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: AI response generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                 output:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                     sessionId:
 *                       type: string
 */
aiRoute.post(
  '/chat',
  authHandler.userAccess,
  validateRequest(chatRequestSchema, 'body'),
  aiController.chat
);

/**
 * @openapi
 * /api/v1/ai/chat-history:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get chat history
 *     description: Retrieve chat history for a session or all sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: Chat history retrieved
 */
aiRoute.get(
  '/chat-history',
  authHandler.userAccess,
  validateRequest(getChatHistorySchema, 'query'),
  aiController.getChatHistory
);

/**
 * @openapi
 * /api/v1/ai/chat-history/{sessionId}:
 *   delete:
 *     tags:
 *       - AI
 *     summary: Clear chat history
 *     description: Delete chat history for a specific session or all sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chat history cleared
 */
aiRoute.delete('/chat-history/:sessionId?', authHandler.userAccess, aiController.clearChatHistory);

/**
 * @openapi
 * /api/v1/ai/debt-strategy:
 *   post:
 *     tags:
 *       - AI
 *     summary: Generate debt-free strategy
 *     description: AI-powered analysis and recommendations for becoming debt-free
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthlyIncome:
 *                 type: number
 *                 description: Optional override for monthly income
 *           example:
 *             monthlyIncome: 200000
 *     responses:
 *       200:
 *         description: Debt strategy generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                 output:
 *                   $ref: '#/components/schemas/DebtStrategy'
 */
aiRoute.post(
  '/debt-strategy',
  authHandler.userAccess,
  validateRequest(debtStrategySchema, 'body'),
  aiController.debtStrategy
);

/**
 * @openapi
 * /api/v1/ai/budget-recommendations:
 *   post:
 *     tags:
 *       - AI
 *     summary: Get budget recommendations
 *     description: AI-powered budget optimization suggestions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthlyIncome:
 *                 type: number
 *           example:
 *             monthlyIncome: 200000
 *     responses:
 *       200:
 *         description: Budget recommendations generated
 */
aiRoute.post(
  '/budget-recommendations',
  authHandler.userAccess,
  validateRequest(budgetRecommendationsSchema, 'body'),
  aiController.budgetRecommendations
);

export { aiRoute };

/**
 * @openapi
 * components:
 *   schemas:
 *     CategorySuggestion:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *         narration:
 *           type: string
 *         amount:
 *           type: number
 *         currentCategory:
 *           type: string
 *         suggestedCategory:
 *           type: string
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Confidence percentage (0-100)
 *         reasoning:
 *           type: string
 *           description: AI explanation for the suggestion
 *     DebtStrategy:
 *       type: object
 *       properties:
 *         totalDebt:
 *           type: number
 *         monthlyIncome:
 *           type: number
 *         totalEMI:
 *           type: number
 *         availableForDebt:
 *           type: number
 *         strategy:
 *           type: string
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *         payoffTimeline:
 *           type: string
 *         priorityDebts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               debtName:
 *                 type: string
 *               priority:
 *                 type: number
 *               reasoning:
 *                 type: string
 *   responses:
 *     BadRequest:
 *       description: Bad request - validation error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: number
 *                 example: 400
 *               message:
 *                 type: string
 *               errors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     message:
 *                       type: string
 *     Unauthorized:
 *       description: Unauthorized - invalid or missing token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: number
 *                 example: 401
 *               message:
 *                 type: string
 */
