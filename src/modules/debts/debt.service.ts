import { CustomError } from '../../shared/core/ApiError';
import { Debt, IDebtDetails } from './models/debts.model';
import { DebtPayment } from './models/debt-payment.model';
import { RepaymentSchedule, IRepaymentScheduleItem } from './models/repayment-schedule.model';
import { DebtTransactionLink } from './models/debt-transaction-link.model';
import { common } from '../../utils/common';
import { Types, Document } from 'mongoose';
import aiService from '../ai/ai.service';

interface RecordPaymentData {
  debtId: string;
  amount: number;
  paymentDate: Date;
  transactionId?: string;
  notes?: string;
}

interface PayoffProjection {
  monthlyPayment: number;
  totalMonths: number;
  totalInterest: number;
  totalPayment: number;
  payoffDate: Date;
  monthlyBreakdown: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }>;
}

interface DebtSummary {
  totalDebt: number;
  totalRemaining: number;
  totalMonthlyEMI: number;
  totalPaid: number;
  activeDebtsCount: number;
  paidDebtsCount: number;
  overallProgress: number;
  highestInterestDebt: {
    debtName: string;
    interestRate: number;
    remaining: number;
  } | null;
  debts: Array<{
    debtId: string;
    debtName: string;
    totalAmount: number;
    remainingAmount: number;
    monthlyEMI: number;
    status: string;
    progressPercentage: number;
  }>;
}

type DebtDocument = Document & {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  debtDetails: IDebtDetails;
  createdAt?: Date;
  updatedAt?: Date;
};

class DebtService {
  /**
   * Transform MongoDB debt document to frontend format
   */
  private transformDebtToFrontend(debt: DebtDocument & { createdAt?: Date; updatedAt?: Date }) {
    return {
      _id: debt._id.toString(),
      debtName: debt.debtDetails.debtName,
      lender: debt.debtDetails.lender,
      principal: debt.debtDetails.totalAmount,
      interestRate: debt.debtDetails.interestRate,
      startDate: debt.debtDetails.startDate,
      expectedEndDate: debt.debtDetails.expectedEndDate,
      monthlyExpectedEMI: debt.debtDetails.monthlyExpectedEMI,
      remainingBalance: debt.debtDetails.remainingAmount,
      totalInterestPayable: 0, // Can be calculated if needed
      nextPaymentDate: debt.debtDetails.paymentDate,
      status: debt.debtDetails.debtStatus,
      linkedTransactionIds: [],
      emiType: debt.debtDetails.emiType || 'PRINCIPAL_AND_INTEREST',
      principalComponent: debt.debtDetails.principalComponent || 0,
      interestComponent: debt.debtDetails.interestComponent || 0,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    };
  }

  addDebtService = async (debtDetails: IDebtDetails, userId?: Types.ObjectId) => {
    const debt = new Debt({
      userId,
      debtDetails,
    });
    const createdDebt = await debt.save();
    if (!createdDebt) throw new CustomError('Something went wrong while creating the debt');

    return this.transformDebtToFrontend(createdDebt);
  };

  updateDebtService = async (debtId: string, debtData: IDebtDetails, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not exist');

    const updateData = {
      ...(debtData.debtName && { 'debtDetails.debtName': debtData.debtName }),
      ...(debtData.startDate && { 'debtDetails.startDate': debtData.startDate }),
      ...(debtData.expectedEndDate && { 'debtDetails.expectedEndDate': debtData.expectedEndDate }),
      ...(debtData.totalAmount && { 'debtDetails.totalAmount': debtData.totalAmount }),
      ...(debtData.remainingAmount && { 'debtDetails.remainingAmount': debtData.remainingAmount }),
      ...(debtData.interestRate && { 'debtDetails.interestRate': debtData.interestRate }),
      ...(debtData.debtStatus && { 'debtDetails.debtStatus': debtData.debtStatus }),
      ...(debtData.monthlyActualEMI && {
        'debtDetails.monthlyActualEMI': debtData.monthlyActualEMI,
      }),
      ...(debtData.monthlyExpectedEMI && {
        'debtDetails.monthlyExpectedEMI': debtData.monthlyExpectedEMI,
      }),
      ...(debtData.partPayment && { 'debtDetails.partPayment': debtData.partPayment }),
      ...(debtData.paymentDate && { 'debtDetails.paymentDate': debtData.paymentDate }),
      ...(debtData.lender && { 'debtDetails.lender': debtData.lender }),
    };
    const updatedDebt = await Debt.findOneAndUpdate(
      { _id: debt._id, userId },
      { $set: updateData },
      { new: true }
    );
    if (!updatedDebt) throw new CustomError('Something went wrong while updating the debt');
    return this.transformDebtToFrontend(updatedDebt);
  };

  getDebtService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not exist');
    return this.transformDebtToFrontend(debt);
  };

  listDebtService = async (userId?: Types.ObjectId) => {
    const debts = await Debt.find({ userId });
    return debts.map((debt) => this.transformDebtToFrontend(debt));
  };

  removeDebtService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not exist');
    const deletedData = await debt.deleteOne();
    if (deletedData.deletedCount === 0)
      throw new CustomError('Something went wrong while removing the debt');
    return 'Debt deleted successfully';
  };

  /**
   * Record a payment for a debt
   * Reduces remaining amount and auto-marks as PAID when fully paid
   */
  recordPaymentService = async (paymentData: RecordPaymentData, userId?: Types.ObjectId) => {
    const { debtId, amount, paymentDate, transactionId, notes } = paymentData;

    // Validate debt exists and belongs to user
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    // Validate payment amount
    if (amount <= 0) throw new CustomError('Payment amount must be greater than 0');
    if (amount > debt.debtDetails.remainingAmount) {
      throw new CustomError('Payment amount cannot exceed remaining amount');
    }

    // Create payment record
    const payment = new DebtPayment({
      userId,
      debtId: debt._id,
      amount,
      paymentDate,
      transactionId: transactionId ? common.convertToObjectId(transactionId) : undefined,
      notes,
    });

    const savedPayment = await payment.save();
    if (!savedPayment) throw new CustomError('Failed to record payment');

    // Update debt remaining amount
    const newRemainingAmount = debt.debtDetails.remainingAmount - amount;
    const updateData: Record<string, number | string> = {
      'debtDetails.remainingAmount': newRemainingAmount,
    };

    // Auto-mark as PAID if fully paid
    if (newRemainingAmount === 0) {
      updateData['debtDetails.debtStatus'] = 'PAID';
    }

    const updatedDebt = await Debt.findOneAndUpdate(
      { _id: debt._id, userId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedDebt) throw new CustomError('Failed to update debt');

    const transformedDebt = this.transformDebtToFrontend(updatedDebt);

    const result: {
      payment: typeof savedPayment;
      updatedDebt: typeof transformedDebt;
      message?: string;
    } = {
      payment: savedPayment,
      updatedDebt: transformedDebt,
    };

    // Add message if debt is fully paid
    if (newRemainingAmount === 0) {
      result.message = 'Congratulations! This debt has been marked as PAID.';
    }

    return result;
  };

  /**
   * Get payment history for a debt
   */
  getPaymentHistoryService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const payments = await DebtPayment.find({ debtId: debt._id, userId })
      .sort({ paymentDate: -1 })
      .populate('transactionId', 'amount transactionDate description');

    return {
      debtId: debt._id,
      debtName: debt.debtDetails.debtName,
      payments,
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: payments.length,
    };
  };

  /**
   * Calculate payoff projection using amortization formula
   */
  getPayoffProjectionService = async (
    debtId: string,
    userId?: Types.ObjectId
  ): Promise<PayoffProjection> => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const principal = debt.debtDetails.remainingAmount;
    const annualRate = debt.debtDetails.interestRate / 100;
    const monthlyRate = annualRate / 12;
    const monthlyPayment = debt.debtDetails.monthlyExpectedEMI;

    // Calculate number of months using amortization formula
    // n = -log(1 - (P * r) / M) / log(1 + r)
    let totalMonths: number;
    if (monthlyRate === 0) {
      totalMonths = Math.ceil(principal / monthlyPayment);
    } else {
      totalMonths = Math.ceil(
        -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
      );
    }

    // Generate monthly breakdown
    const monthlyBreakdown = [];
    let remainingBalance = principal;
    let totalInterest = 0;

    for (let month = 1; month <= totalMonths; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      // Handle last payment
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }

      totalInterest += interestPayment;

      monthlyBreakdown.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: Math.max(0, remainingBalance),
      });

      if (remainingBalance === 0) break;
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + totalMonths);

    return {
      monthlyPayment,
      totalMonths,
      totalInterest,
      totalPayment: principal + totalInterest,
      payoffDate,
      monthlyBreakdown,
    };
  };

  /**
   * Get comprehensive debt summary
   */
  getDebtSummaryService = async (userId?: Types.ObjectId): Promise<DebtSummary> => {
    const debts = await Debt.find({ userId });

    if (debts.length === 0) {
      return {
        totalDebt: 0,
        totalRemaining: 0,
        totalMonthlyEMI: 0,
        totalPaid: 0,
        activeDebtsCount: 0,
        paidDebtsCount: 0,
        overallProgress: 0,
        highestInterestDebt: null,
        debts: [],
      };
    }

    let totalDebt = 0;
    let totalRemaining = 0;
    let totalMonthlyEMI = 0;
    let activeDebtsCount = 0;
    let paidDebtsCount = 0;
    let highestInterestDebt: { debtName: string; interestRate: number; remaining: number } | null =
      null;

    const debtSummaries = debts.map((debt) => {
      const totalAmount = debt.debtDetails.totalAmount;
      const remainingAmount = debt.debtDetails.remainingAmount;
      const monthlyEMI = debt.debtDetails.monthlyExpectedEMI;
      const status = debt.debtDetails.debtStatus;
      const interestRate = debt.debtDetails.interestRate;

      totalDebt += totalAmount;
      totalRemaining += remainingAmount;

      if (status === 'PAID') {
        paidDebtsCount++;
      } else {
        activeDebtsCount++;
        totalMonthlyEMI += monthlyEMI;

        // Track highest interest debt
        if (
          remainingAmount > 0 &&
          (!highestInterestDebt || interestRate > highestInterestDebt.interestRate)
        ) {
          highestInterestDebt = {
            debtName: debt.debtDetails.debtName,
            interestRate,
            remaining: remainingAmount,
          };
        }
      }

      const progressPercentage =
        totalAmount > 0 ? ((totalAmount - remainingAmount) / totalAmount) * 100 : 0;

      return {
        debtId: debt._id.toString(),
        debtName: debt.debtDetails.debtName,
        totalAmount,
        remainingAmount,
        monthlyEMI,
        status,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
      };
    });

    const totalPaid = totalDebt - totalRemaining;
    const overallProgress = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

    return {
      totalDebt,
      totalRemaining,
      totalMonthlyEMI,
      totalPaid,
      activeDebtsCount,
      paidDebtsCount,
      overallProgress: Math.round(overallProgress * 100) / 100,
      highestInterestDebt,
      debts: debtSummaries,
    };
  };

  /**
   * Get AI-powered debt strategy recommendations
   */
  getDebtStrategyService = async (
    userId?: Types.ObjectId,
    monthlyIncome?: number,
    monthlyExpenses?: number
  ) => {
    const debts = await Debt.find({ userId, 'debtDetails.debtStatus': { $ne: 'PAID' } });

    if (debts.length === 0) {
      return {
        message: 'No active debts found. You are debt-free!',
        strategy: null,
      };
    }

    // Prepare debt data for AI
    const debtData = debts.map((debt) => ({
      debtId: debt._id.toString(),
      debtName: debt.debtDetails.debtName,
      totalAmount: debt.debtDetails.totalAmount,
      remainingAmount: debt.debtDetails.remainingAmount,
      monthlyEMI: debt.debtDetails.monthlyExpectedEMI,
      interestRate: debt.debtDetails.interestRate,
      emiType: debt.debtDetails.emiType || 'PRINCIPAL_AND_INTEREST',
      principalComponent: debt.debtDetails.principalComponent || 0,
      interestComponent: debt.debtDetails.interestComponent || 0,
    }));

    // Use provided values or defaults
    const income = monthlyIncome || 100000; // Default if not provided
    const expenses = monthlyExpenses || 50000; // Default if not provided

    const strategy = await aiService.analyzeDebtStrategy({
      monthlyIncome: income,
      debts: debtData,
      monthlyExpenses: expenses,
    });

    return {
      message: 'Debt strategy generated successfully',
      strategy,
      debtCount: debts.length,
    };
  };

  /**
   * Get detailed debt view with all related information
   * Combines debt info, payment history, and payoff projection in one call
   */
  getDetailedDebtService = async (debtId: string, userId?: Types.ObjectId) => {
    // Get debt information
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    // Get payment history
    const payments = await DebtPayment.find({ debtId: debt._id, userId })
      .sort({ paymentDate: -1 })
      .populate('transactionId', 'amount transactionDate description');

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentHistory = {
      payments,
      totalPaid,
      paymentCount: payments.length,
      recentPayments: payments.slice(0, 5), // Last 5 payments
    };

    // Calculate payoff projection (only for active debts)
    let payoffProjection: PayoffProjection | null = null;
    if (debt.debtDetails.debtStatus !== 'PAID') {
      const principal = debt.debtDetails.remainingAmount;
      const annualRate = debt.debtDetails.interestRate / 100;
      const monthlyRate = annualRate / 12;
      const monthlyPayment = debt.debtDetails.monthlyExpectedEMI;

      let totalMonths: number;
      if (monthlyRate === 0) {
        totalMonths = Math.ceil(principal / monthlyPayment);
      } else {
        totalMonths = Math.ceil(
          -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
        );
      }

      const monthlyBreakdown = [];
      let remainingBalance = principal;
      let totalInterest = 0;

      for (let month = 1; month <= totalMonths; month++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        remainingBalance -= principalPayment;

        if (remainingBalance < 0) {
          remainingBalance = 0;
        }

        totalInterest += interestPayment;

        monthlyBreakdown.push({
          month,
          payment: monthlyPayment,
          principal: principalPayment,
          interest: interestPayment,
          remainingBalance: Math.max(0, remainingBalance),
        });

        if (remainingBalance === 0) break;
      }

      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + totalMonths);

      payoffProjection = {
        monthlyPayment,
        totalMonths,
        totalInterest,
        totalPayment: principal + totalInterest,
        payoffDate,
        monthlyBreakdown,
      };
    }

    // Calculate progress and statistics
    const progressPercentage =
      debt.debtDetails.totalAmount > 0
        ? ((debt.debtDetails.totalAmount - debt.debtDetails.remainingAmount) /
            debt.debtDetails.totalAmount) *
          100
        : 0;

    return {
      debt: this.transformDebtToFrontend(debt),
      paymentHistory,
      payoffProjection,
      statistics: {
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        totalPaid,
        totalAmount: debt.debtDetails.totalAmount,
        remainingAmount: debt.debtDetails.remainingAmount,
        monthsElapsed: payments.length > 0 ? payments.length : 0,
      },
    };
  };

  /**
   * Generate repayment schedule automatically based on debt details
   */
  generateRepaymentScheduleService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const remainingAmount = debt.debtDetails.remainingAmount;
    const annualRate = debt.debtDetails.interestRate / 100;
    const monthlyRate = annualRate / 12;
    const monthlyPayment = debt.debtDetails.monthlyExpectedEMI;

    // Calculate total months using amortization formula
    let totalMonths: number;
    if (monthlyRate === 0) {
      totalMonths = Math.ceil(remainingAmount / monthlyPayment);
    } else {
      totalMonths = Math.ceil(
        -Math.log(1 - (remainingAmount * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
      );
    }

    // Generate schedule items
    const scheduleItems: IRepaymentScheduleItem[] = [];
    let balance = remainingAmount;
    const startDate = new Date(debt.debtDetails.paymentDate);

    for (let month = 1; month <= totalMonths; month++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);

      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      if (balance < 0) balance = 0;

      scheduleItems.push({
        month,
        dueDate,
        expectedAmount: monthlyPayment,
        principalComponent: principalPayment,
        interestComponent: interestPayment,
        expectedBalance: Math.max(0, balance),
        status: 'UPCOMING',
        variance: 0,
      });

      if (balance === 0) break;
    }

    // Save or update schedule
    const existingSchedule = await RepaymentSchedule.findOne({ debtId: debt._id, userId });
    if (existingSchedule) {
      existingSchedule.scheduleItems = scheduleItems;
      existingSchedule.scheduleType = 'AUTO_GENERATED';
      await existingSchedule.save();
    } else {
      await RepaymentSchedule.create({
        debtId: debt._id,
        userId,
        scheduleType: 'AUTO_GENERATED',
        scheduleItems,
      });
    }

    // Update debt
    await Debt.updateOne(
      { _id: debt._id, userId },
      { $set: { 'debtDetails.hasRepaymentSchedule': true } }
    );

    return {
      message: 'Repayment schedule generated successfully',
      totalMonths,
      scheduleItems,
    };
  };

  /**
   * Import repayment schedule from data array
   */
  importRepaymentScheduleService = async (
    debtId: string,
    scheduleData: Array<{
      month: number;
      dueDate: string;
      expectedAmount: number;
      principalComponent: number;
      interestComponent: number;
      expectedBalance: number;
    }>,
    userId?: Types.ObjectId
  ) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const scheduleItems: IRepaymentScheduleItem[] = scheduleData.map((item) => ({
      month: item.month,
      dueDate: new Date(item.dueDate),
      expectedAmount: item.expectedAmount,
      principalComponent: item.principalComponent,
      interestComponent: item.interestComponent,
      expectedBalance: item.expectedBalance,
      status: 'UPCOMING',
      variance: 0,
    }));

    // Save or update schedule
    const existingSchedule = await RepaymentSchedule.findOne({ debtId: debt._id, userId });
    if (existingSchedule) {
      existingSchedule.scheduleItems = scheduleItems;
      existingSchedule.scheduleType = 'IMPORTED';
      await existingSchedule.save();
    } else {
      await RepaymentSchedule.create({
        debtId: debt._id,
        userId,
        scheduleType: 'IMPORTED',
        scheduleItems,
      });
    }

    // Update debt
    await Debt.updateOne(
      { _id: debt._id, userId },
      { $set: { 'debtDetails.hasRepaymentSchedule': true } }
    );

    return {
      message: 'Repayment schedule imported successfully',
      itemCount: scheduleItems.length,
    };
  };

  /**
   * Get repayment schedule for a debt
   */
  getRepaymentScheduleService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const schedule = await RepaymentSchedule.findOne({ debtId: debt._id, userId });
    if (!schedule) {
      return {
        message: 'No repayment schedule found',
        hasSchedule: false,
        schedule: null,
      };
    }

    return {
      message: 'Repayment schedule retrieved successfully',
      hasSchedule: true,
      schedule: {
        scheduleType: schedule.scheduleType,
        scheduleItems: schedule.scheduleItems,
        totalItems: schedule.scheduleItems.length,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      },
    };
  };

  /**
   * Link a transaction to a debt
   */
  linkTransactionToDebtService = async (
    debtId: string,
    transactionId: string,
    linkType: 'AUTO' | 'MANUAL',
    userId?: Types.ObjectId,
    confidence?: number,
    notes?: string
  ) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    // Check if transaction is already linked to another debt
    const existingLink = await DebtTransactionLink.findOne({
      transactionId: common.convertToObjectId(transactionId),
      userId,
    });

    if (existingLink) {
      throw new CustomError('Transaction is already linked to another debt');
    }

    // Create link
    const link = await DebtTransactionLink.create({
      userId,
      debtId: debt._id,
      transactionId: common.convertToObjectId(transactionId),
      linkType,
      confidence: linkType === 'AUTO' ? confidence : undefined,
      notes,
      linkedDate: new Date(),
    });

    return {
      message: 'Transaction linked successfully',
      link: {
        _id: link._id,
        transactionId: link.transactionId,
        linkType: link.linkType,
        confidence: link.confidence,
        linkedDate: link.linkedDate,
        createdBy: link.createdBy,
      },
    };
  };

  /**
   * Unlink a transaction from a debt
   */
  unlinkTransactionFromDebtService = async (
    debtId: string,
    transactionId: string,
    userId?: Types.ObjectId
  ) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const result = await DebtTransactionLink.deleteOne({
      debtId: debt._id,
      transactionId: common.convertToObjectId(transactionId),
      userId,
    });

    if (result.deletedCount === 0) {
      throw new CustomError('Transaction link not found');
    }

    return {
      message: 'Transaction unlinked successfully',
    };
  };

  /**
   * Get all transactions linked to a debt
   */
  getLinkedTransactionsService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const links = await DebtTransactionLink.find({ debtId: debt._id, userId })
      .populate('transactionId')
      .sort({ linkedDate: -1 });

    return {
      message: 'Linked transactions retrieved successfully',
      links: links.map((link) => ({
        _id: link._id,
        transactionId: link.transactionId,
        linkType: link.linkType,
        confidence: link.confidence,
        linkedDate: link.linkedDate,
        notes: link.notes,
        createdBy: link.createdBy,
      })),
      totalLinks: links.length,
    };
  };

  /**
   * Update schedule item status and link to payment
   */
  updateScheduleItemService = async (
    debtId: string,
    month: number,
    updates: {
      status?: 'UPCOMING' | 'PAID' | 'PARTIAL' | 'MISSED' | 'OVERPAID';
      actualPaymentId?: string;
      linkedTransactionId?: string;
      variance?: number;
      notes?: string;
    },
    userId?: Types.ObjectId
  ) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not found');

    const schedule = await RepaymentSchedule.findOne({ debtId: debt._id, userId });
    if (!schedule) throw new CustomError('Repayment schedule not found');

    const itemIndex = schedule.scheduleItems.findIndex((item) => item.month === month);
    if (itemIndex === -1) throw new CustomError('Schedule item not found');

    // Update the item
    if (updates.status) schedule.scheduleItems[itemIndex].status = updates.status;
    if (updates.actualPaymentId)
      schedule.scheduleItems[itemIndex].actualPaymentId = common.convertToObjectId(
        updates.actualPaymentId
      ) as Types.ObjectId;
    if (updates.linkedTransactionId)
      schedule.scheduleItems[itemIndex].linkedTransactionId = common.convertToObjectId(
        updates.linkedTransactionId
      ) as Types.ObjectId;
    if (updates.variance !== undefined)
      schedule.scheduleItems[itemIndex].variance = updates.variance;
    if (updates.notes) schedule.scheduleItems[itemIndex].notes = updates.notes;

    await schedule.save();

    return {
      message: 'Schedule item updated successfully',
      updatedItem: schedule.scheduleItems[itemIndex],
    };
  };
}

export { DebtService };
