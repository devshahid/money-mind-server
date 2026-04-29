import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { CustomRequest } from '../middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../core/ApiError';
import aiService from '../services/ai.service';
import { TransactionLogs } from '../models/transaction-logs.model';
import { Debt } from '../models/debts.model';
import { Budget } from '../models/budget.model';
import dayjs from 'dayjs';

class AIController extends ResponseHandler {
  /**
   * Categorize transactions using AI
   * POST /api/v1/ai/categorize-transactions
   * Body: { transactionIds: string[] } or { all: true }
   */
  categorizeTransactions = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { transactionIds, all } = req.body;

    // Find transactions to categorize
    const query: Record<string, unknown> = { userId };
    if (all) {
      // Categorize all transactions without a category
      query.category = { $in: [null, '', 'Others'] };
    } else if (transactionIds && Array.isArray(transactionIds)) {
      query._id = { $in: transactionIds };
    } else {
      throw new CustomError('Please provide transactionIds or set all=true');
    }

    const transactions = await TransactionLogs.find(query).limit(100); // Limit to 100 at a time

    if (transactions.length === 0) {
      await this.sendResponse({ message: 'No transactions to categorize', results: [] }, res);
      return;
    }

    // Prepare transactions for batch categorization
    const transactionsData = transactions.map((t) => ({
      id: t._id.toString(),
      narration: t.narration || '',
      amount: t.amount || 0,
      isCredit: t.isCredit || false,
    }));

    // Call AI service for batch categorization
    const categorizations = await aiService.categorizeTransactionsBatch(transactionsData);

    // Update transactions with categories
    const updates = [];
    for (const cat of categorizations) {
      const transaction = transactions.find((t) => t._id.toString() === cat.transactionId);
      if (transaction && cat.confidence > 0.6) {
        // Only update if confidence > 60%
        transaction.category = cat.category;
        await transaction.save();
        updates.push({
          transactionId: cat.transactionId,
          oldCategory: transaction.category,
          newCategory: cat.category,
          confidence: cat.confidence,
          reasoning: cat.reasoning,
        });
      }
    }

    await this.sendResponse(
      {
        message: `Successfully categorized ${updates.length} transactions`,
        categorized: updates.length,
        total: transactions.length,
        results: updates,
      },
      res
    );
  });

  /**
   * Suggest expense groups based on transaction patterns
   * POST /api/v1/ai/suggest-groups
   */
  suggestGroups = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    // TODO: Implement group suggestions
    await this.sendResponse({ message: 'Feature coming soon' }, res);
  });

  /**
   * Get debt-free strategy
   * POST /api/v1/ai/debt-strategy
   */
  debtStrategy = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;

    // Get all active debts
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

    // Get monthly income and expenses
    const { monthlyIncome = 200000 } = req.body; // Default to 2 lac if not provided

    // Calculate average monthly expenses from last 3 months
    const threeMonthsAgo = dayjs().subtract(3, 'month').toDate();
    const transactions = await TransactionLogs.find({
      userId,
      transactionDate: { $gte: threeMonthsAgo },
      isCredit: false, // Only expenses
    });

    const totalExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgMonthlyExpenses = totalExpenses / 3;

    // Prepare debt data for AI
    const debtsData = debts.map((d) => ({
      debtName: d.debtDetails.debtName || 'Unnamed Debt',
      totalAmount: d.debtDetails.totalAmount || 0,
      remainingAmount: d.debtDetails.remainingAmount || 0,
      monthlyEMI: d.debtDetails.monthlyActualEMI || d.debtDetails.monthlyExpectedEMI || 0,
      interestRate: d.debtDetails.interestRate || 0,
    }));

    // Get AI strategy
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
   * Get goal advice
   * POST /api/v1/ai/goal-advice
   */
  goalAdvice = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    // TODO: Implement goal advice
    await this.sendResponse({ message: 'Feature coming soon' }, res);
  });

  /**
   * Get budget recommendations
   * POST /api/v1/ai/budget-recommendations
   */
  budgetRecommendations = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { monthlyIncome = 200000 } = req.body;

    // Get current month's budget
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

    // Get spending history (last 3-6 months)
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

    // Get AI recommendations
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

  /**
   * Chat with AI assistant
   * POST /api/v1/ai/chat
   * Body: { message: string }
   */
  chat = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const { message } = req.body;

    if (!message) {
      throw new CustomError('Please provide a message');
    }

    // Get user context (recent transactions, debts, goals)
    const userId = req.user._id;
    const recentTransactions = await TransactionLogs.find({ userId })
      .sort({ transactionDate: -1 })
      .limit(10);

    const debts = await Debt.find({ userId });
    const context = {
      recentTransactionsCount: recentTransactions.length,
      hasDebts: debts.length > 0,
      debtCount: debts.length,
    };

    const response = await aiService.chat(message, context);

    await this.sendResponse(
      {
        message: 'Response generated',
        response,
      },
      res
    );
  });
}

export { AIController };
