import { CustomError } from '../../shared/core/ApiError';
import { Debt, IDebtDetails } from './models/debts.model';
import { DebtPayment } from './models/debt-payment.model';
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
}

export { DebtService };
