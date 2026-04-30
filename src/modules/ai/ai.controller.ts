import { asyncHandler } from '../../shared/utils';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../../shared/core/ApiError';
import aiService from './ai.service';
import { TransactionLogs } from '../transactions/models/transaction-logs.model';
import { Debt } from '../debts/models/debts.model';
import { Budget } from '../budgets/models/budget.model';
import { AIChatHistory } from './models/ai-chat-history.model';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

class AIController extends ResponseHandler {
  /**
   * Get AI category suggestions (doesn't auto-apply)
   * POST /api/v1/ai/suggest-categories
   * Body: { transactionIds: string[] } or { all: true }
   */
  suggestCategories = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { transactionIds, all } = req.body;

    // Find transactions to categorize
    const query: Record<string, unknown> = { userId };
    if (all) {
      query.category = { $in: [null, '', 'Others'] };
    } else if (transactionIds && Array.isArray(transactionIds)) {
      query._id = { $in: transactionIds };
    } else {
      throw new CustomError('Please provide transactionIds or set all=true');
    }

    const transactions = await TransactionLogs.find(query).limit(100);

    if (transactions.length === 0) {
      await this.sendResponse({ message: 'No transactions to categorize', suggestions: [] }, res);
      return;
    }

    const transactionsData = transactions.map((t) => ({
      id: t._id.toString(),
      narration: t.narration || '',
      amount: t.amount || 0,
      isCredit: t.isCredit || false,
      currentCategory: t.category || '',
    }));

    const categorizations = await aiService.categorizeTransactionsBatch(transactionsData);

    // Return suggestions with transaction details
    const suggestions = categorizations.map((cat) => {
      const transaction = transactions.find((t) => t._id.toString() === cat.transactionId);
      return {
        transactionId: cat.transactionId,
        narration: transaction?.narration || '',
        amount: transaction?.amount || 0,
        currentCategory: transaction?.category || '',
        suggestedCategory: cat.category,
        confidence: cat.confidence,
        reasoning: cat.reasoning,
      };
    });

    await this.sendResponse(
      {
        message: `Generated ${suggestions.length} AI category suggestions`,
        total: suggestions.length,
        suggestions,
      },
      res
    );
  });

  /**
   * Apply AI category suggestions (bulk)
   * POST /api/v1/ai/apply-suggestions
   * Body: { suggestions: Array<{ transactionId, category, confidence }> }
   */
  applySuggestions = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { suggestions } = req.body;

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new CustomError('Please provide suggestions to apply');
    }

    const applied = [];
    const failed = [];

    for (const suggestion of suggestions) {
      const { transactionId, category, confidence } = suggestion;

      try {
        const transaction = await TransactionLogs.findOne({ _id: transactionId, userId });

        if (!transaction) {
          failed.push({ transactionId, reason: 'Transaction not found' });
          continue;
        }

        transaction.category = category;
        transaction.aiSuggested = true;
        transaction.aiConfidence = confidence || 0;
        transaction.aiConfirmed = true;
        await transaction.save();

        applied.push({
          transactionId,
          category,
          confidence,
        });
      } catch {
        failed.push({ transactionId, reason: 'Update failed' });
      }
    }

    await this.sendResponse(
      {
        message: `Applied ${applied.length} suggestions`,
        applied: applied.length,
        failed: failed.length,
        details: { applied, failed },
      },
      res
    );
  });

  /**
   * Reject/dismiss AI suggestions
   * POST /api/v1/ai/reject-suggestions
   * Body: { transactionIds: string[] }
   */
  rejectSuggestions = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new CustomError('Please provide transaction IDs to reject');
    }

    await this.sendResponse(
      {
        message: `Rejected ${transactionIds.length} suggestions`,
        rejected: transactionIds.length,
      },
      res
    );
  });

  /**
   * Chat with AI assistant (with memory)
   * POST /api/v1/ai/chat
   * Body: { message: string, sessionId?: string }
   */
  chat = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { message, sessionId: providedSessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new CustomError('Please provide a valid message');
    }

    // Get or create session
    const sessionId = providedSessionId || uuidv4();
    let chatHistory = await AIChatHistory.findOne({ userId, sessionId });

    if (!chatHistory) {
      chatHistory = new AIChatHistory({
        userId,
        sessionId,
        messages: [],
      });
    }

    // Get user context
    const recentTransactions = await TransactionLogs.find({ userId })
      .sort({ transactionDate: -1 })
      .limit(10);

    const debts = await Debt.find({ userId, 'debtDetails.debtStatus': { $ne: 'PAID' } });

    const context = {
      recentTransactionsCount: recentTransactions.length,
      hasDebts: debts.length > 0,
      debtCount: debts.length,
      conversationHistory: chatHistory.messages.slice(-10), // Last 10 messages
    };

    // Get AI response
    const aiResponse = await aiService.chat(message, context);

    // Save to history
    chatHistory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    chatHistory.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });
    chatHistory.lastMessageAt = new Date();
    await chatHistory.save();

    await this.sendResponse(
      {
        message: 'Chat response generated',
        response: aiResponse,
        sessionId,
      },
      res
    );
  });

  /**
   * Get chat history
   * GET /api/v1/ai/chat-history?sessionId=xxx
   */
  getChatHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { sessionId } = req.query;

    if (sessionId) {
      const chatHistory = await AIChatHistory.findOne({ userId, sessionId: sessionId as string });
      await this.sendResponse({ chatHistory }, res);
    } else {
      const sessions = await AIChatHistory.find({ userId }).sort({ lastMessageAt: -1 }).limit(10);
      await this.sendResponse({ sessions }, res);
    }
  });

  /**
   * Clear chat history
   * DELETE /api/v1/ai/chat-history/:sessionId
   */
  clearChatHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { sessionId } = req.params;

    if (sessionId) {
      await AIChatHistory.deleteOne({ userId, sessionId });
      await this.sendResponse({ message: 'Chat history cleared' }, res);
    } else {
      await AIChatHistory.deleteMany({ userId });
      await this.sendResponse({ message: 'All chat history cleared' }, res);
    }
  });

  /**
   * Get debt-free strategy
   * POST /api/v1/ai/debt-strategy
   */
  debtStrategy = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const debts = await Debt.find({
      userId,
      'debtDetails.debtStatus': { $ne: 'PAID' },
    });

    if (debts.length === 0) {
      await this.sendResponse(
        {
          message: 'No active debts found. Congratulations! 🎉',
          strategy: null,
        },
        res
      );
      return;
    }

    const { monthlyIncome = 200000 } = req.body;
    const threeMonthsAgo = dayjs().subtract(3, 'month').toDate();
    const transactions = await TransactionLogs.find({
      userId,
      transactionDate: { $gte: threeMonthsAgo },
      isCredit: false,
    });

    const totalExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgMonthlyExpenses = totalExpenses / 3;

    const debtsData = debts.map((d) => ({
      debtName: d.debtDetails.debtName || 'Unnamed Debt',
      totalAmount: d.debtDetails.totalAmount || 0,
      remainingAmount: d.debtDetails.remainingAmount || 0,
      monthlyEMI: d.debtDetails.monthlyActualEMI || d.debtDetails.monthlyExpectedEMI || 0,
      interestRate: d.debtDetails.interestRate || 0,
    }));

    const strategy = await aiService.analyzeDebtStrategy({
      monthlyIncome,
      debts: debtsData,
      monthlyExpenses: avgMonthlyExpenses,
    });

    await this.sendResponse(
      {
        message: 'Debt-free strategy generated successfully',
        strategy,
      },
      res
    );
  });

  /**
   * Get budget recommendations
   * POST /api/v1/ai/budget-recommendations
   */
  budgetRecommendations = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { monthlyIncome = 200000 } = req.body;

    const currentMonth = parseInt(dayjs().format('YYYYMM'));
    const budget = await Budget.findOne({ userId, month: currentMonth });

    if (!budget) {
      await this.sendResponse(
        {
          message: 'No budget found for current month. Create a budget first.',
          recommendations: [],
        },
        res
      );
      return;
    }

    const sixMonthsAgo = dayjs().subtract(6, 'month').toDate();
    const transactions = await TransactionLogs.aggregate([
      {
        $match: {
          userId,
          transactionDate: { $gte: sixMonthsAgo },
          isCredit: false,
          category: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthsCount = dayjs().diff(dayjs(sixMonthsAgo), 'month');
    const spendingHistory = transactions.map((t) => ({
      category: t._id,
      averageMonthly: Math.round(t.total / monthsCount),
    }));

    const recommendations = await aiService.generateBudgetRecommendations({
      monthlyIncome,
      currentBudget: budget.categories.map((c) => ({
        category: c.categoryName,
        planned: c.plannedAmount,
        actual: c.actualAmount,
      })),
      spendingHistory,
    });

    await this.sendResponse(
      {
        message: 'Budget recommendations generated successfully',
        recommendations,
      },
      res
    );
  });
}

export { AIController };
