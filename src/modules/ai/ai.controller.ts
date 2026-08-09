import { asyncHandler } from '../../shared/utils';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../../shared/core/ApiError';
import aiService from './ai.service';
import { TransactionLogs, ITransactionLogs } from '../transactions/models/transaction-logs.model';
import { Debt } from '../debts/models/debts.model';
import { Budget } from '../budgets/models/budget.model';
import { AIChatHistory } from './models/ai-chat-history.model';
import { CategorizationJob } from './models/categorization-job.model';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

class AIController extends ResponseHandler {
  /**
   * Start AI category suggestion job (async — returns immediately with jobId)
   * POST /api/v1/ai/suggest-categories
   * Body: { transactionIds: string[] } or { all: true }
   */
  suggestCategories = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const userId = req.user._id;
    const { transactionIds, all } = req.body;

    // Deduplication: check if there's already an active job for this user
    // Jobs older than 5 minutes are considered stale (server may have restarted)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingJob = await CategorizationJob.findOne({
      userId,
      status: { $in: ['pending', 'processing'] },
      createdAt: { $gt: fiveMinutesAgo },
    });

    if (existingJob) {
      await this.sendResponse(
        {
          message: 'A categorization job is already in progress',
          jobId: existingJob._id.toString(),
          status: existingJob.status,
          progress: {
            total: existingJob.totalTransactions,
            processed: existingJob.processedTransactions,
          },
        },
        res
      );
      return;
    }

    // Clean up any stale jobs for this user before starting a new one
    await CategorizationJob.updateMany(
      { userId, status: { $in: ['pending', 'processing'] }, createdAt: { $lte: fiveMinutesAgo } },
      { status: 'failed', error: 'Job timed out', completedAt: new Date() }
    );

    // Find transactions to categorize
    const query: Record<string, unknown> = { userId };
    if (all) {
      query.category = { $in: [null, '', 'Others'] };
    } else if (transactionIds && Array.isArray(transactionIds)) {
      query._id = { $in: transactionIds };
    } else {
      throw new CustomError('Please provide transactionIds or set all=true');
    }

    const transactions = await TransactionLogs.find(query);

    if (transactions.length === 0) {
      await this.sendResponse(
        {
          message: 'No transactions to categorize',
          jobId: null,
          status: 'completed',
          suggestions: [],
        },
        res
      );
      return;
    }

    // Create job record
    const job = await CategorizationJob.create({
      userId,
      status: 'pending',
      totalTransactions: transactions.length,
      processedTransactions: 0,
      suggestions: [],
    });

    // Kick off background processing (fire-and-forget)
    this.processCategorizationJob(job._id.toString(), transactions).catch((err) => {
      console.error('[ERROR]:: Background categorization job failed:', err);
    });

    // Return immediately with jobId
    await this.sendResponse(
      {
        message: `Categorization job started for ${transactions.length} transactions`,
        jobId: job._id.toString(),
        status: 'pending',
        progress: {
          total: transactions.length,
          processed: 0,
        },
      },
      res
    );
  });

  /**
   * Background processor for categorization job.
   * Processes chunks and updates job progress incrementally.
   */
  private async processCategorizationJob(
    jobId: string,
    transactions: ITransactionLogs[]
  ): Promise<void> {
    try {
      await CategorizationJob.findByIdAndUpdate(jobId, {
        status: 'processing',
        startedAt: new Date(),
      });

      const transactionsData = transactions.map((t) => ({
        id: t._id.toString(),
        narration: t.narration,
        amount: Number(t.amount),
        isCredit: t.isCredit || false,
        currentCategory: t.category || '',
      }));

      // Process in chunks — update progress after each chunk
      const chunkSize = 10;
      const allSuggestions: Array<{
        transactionId: string;
        narration: string;
        amount: number;
        isCredit: boolean;
        currentCategory: string;
        suggestedCategory: string;
        confidence: number;
        reasoning: string;
        transactionDate: string | null;
        bankName: string;
      }> = [];

      for (let i = 0; i < transactionsData.length; i += chunkSize) {
        const chunk = transactionsData.slice(i, i + chunkSize);

        try {
          const categorizations = await aiService.categorizeTransactionsBatch(chunk);

          const chunkSuggestions = categorizations.map((cat) => {
            const transaction = transactions.find((t) => t._id.toString() === cat.transactionId);
            return {
              transactionId: cat.transactionId,
              narration: transaction?.narration || '',
              amount: Number(transaction?.amount || 0),
              isCredit: transaction?.isCredit || false,
              currentCategory: transaction?.category || '',
              suggestedCategory: cat.category,
              confidence: cat.confidence,
              reasoning: cat.reasoning,
              transactionDate: transaction?.transactionDate?.toISOString() || null,
              bankName: transaction?.bankName || '',
            };
          });

          allSuggestions.push(...chunkSuggestions);

          // Update progress incrementally
          await CategorizationJob.findByIdAndUpdate(jobId, {
            processedTransactions: Math.min(i + chunkSize, transactionsData.length),
            suggestions: allSuggestions,
          });

          console.info(
            `[JOB ${jobId}] Processed ${Math.min(i + chunkSize, transactionsData.length)}/${transactionsData.length} transactions`
          );
        } catch (chunkError) {
          console.error(`[JOB ${jobId}] Chunk ${i / chunkSize + 1} failed:`, chunkError);
          // Continue with next chunk — partial results are still useful
        }
      }

      // Mark job as completed
      await CategorizationJob.findByIdAndUpdate(jobId, {
        status: 'completed',
        processedTransactions: transactionsData.length,
        suggestions: allSuggestions,
        completedAt: new Date(),
      });

      console.info(
        `[JOB ${jobId}] ✅ Completed — ${allSuggestions.length} suggestions for ${transactionsData.length} transactions`
      );
    } catch (error) {
      console.error(`[JOB ${jobId}] ❌ Failed:`, error);
      await CategorizationJob.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
    }
  }

  /**
   * Poll categorization job status and results
   * GET /api/v1/ai/suggest-categories/status/:jobId
   */
  getCategorizationJobStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const { jobId } = req.params;
    const userId = req.user._id;

    const job = await CategorizationJob.findOne({ _id: jobId, userId });

    if (!job) {
      throw new CustomError('Job not found');
    }

    await this.sendResponse(
      {
        jobId: job._id.toString(),
        status: job.status,
        progress: {
          total: job.totalTransactions,
          processed: job.processedTransactions,
        },
        ...(job.status === 'completed' && {
          message: `Generated ${job.suggestions.length} AI category suggestions`,
          total: job.suggestions.length,
          totalUncategorized: job.totalTransactions,
          suggestions: job.suggestions,
        }),
        ...(job.status === 'failed' && {
          error: job.error,
        }),
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
        transaction.aiSuggested = !suggestion.userOverride;
        transaction.aiConfidence = suggestion.userOverride ? 0 : confidence || 0;
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
      .limit(25);

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
      const sessions = await AIChatHistory.find({ userId }).sort({ lastMessageAt: -1 }).limit(25);
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
