import { Document } from 'mongoose';
import { IDateRangeFilter } from '../../shared/types';

/**
 * Transaction Types and Interfaces
 */

// Transaction Document Interface
export interface ITransactionLog extends Document {
  userId: string;
  narration: string;
  amount: number;
  transactionDate: Date;
  category?: string;
  isCredit: boolean;
  aiSuggested?: boolean;
  aiConfidence?: number;
  aiConfirmed?: boolean;
  groupId?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Transaction Group Interface
export interface ITransactionGroup extends Document {
  userId: string;
  groupName: string;
  description?: string;
  transactions: string[]; // Array of transaction IDs
  createdAt: Date;
  updatedAt: Date;
}

// Create Transaction Input
export interface CreateTransactionInput {
  userId: string;
  narration: string;
  amount: number;
  transactionDate: Date;
  category?: string;
  isCredit: boolean;
  groupId?: string;
  labels?: string[];
}

// Update Transaction Input
export interface UpdateTransactionInput {
  narration?: string;
  amount?: number;
  transactionDate?: Date;
  category?: string;
  labels?: string[];
  groupId?: string;
}

// Bulk Update Category Input
export interface BulkUpdateCategoryInput {
  id: string;
  category: string;
  aiConfirmed?: boolean;
}

// Transaction Filters
export interface TransactionFilters extends IDateRangeFilter {
  category?: string;
  isCredit?: boolean;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  groupId?: string;
  hasCategory?: boolean;
}

// Monthly Stats Response
export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  categoryBreakdown: Record<string, number>;
  transactionCount: number;
  month: number;
  year: number;
}

// Category Stats
export interface CategoryStats {
  category: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

// Spending Trend
export interface SpendingTrend {
  date: string;
  amount: number;
  category?: string;
}
