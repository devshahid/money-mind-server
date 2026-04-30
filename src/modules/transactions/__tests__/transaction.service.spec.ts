/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { TransactionLogsService } from '../transaction.service';
import { TransactionLogs } from '../models/transaction-logs.model';
import { Category } from '../models/category.model';
import { Labels } from '../models/labels.model';
import { ClientError, CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/transaction-logs.model');
jest.mock('../models/category.model');
jest.mock('../models/labels.model');
jest.mock('../../../utils/common');
jest.mock('../../../utils/pagination');

describe('TransactionLogsService (Unit Tests)', () => {
  let service: TransactionLogsService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionLogsService(mockUserId);
  });

  describe('uploadLogsFromFile', () => {
    it('should throw ClientError when logs array is empty', async () => {
      await expect(service.uploadLogsFromFile([], 'HDFC')).rejects.toThrow(ClientError);
      await expect(service.uploadLogsFromFile([], 'HDFC')).rejects.toThrow(
        'Rows array is required and must not be empty.'
      );
    });

    it('should throw ClientError when bankName is empty', async () => {
      const logs = [
        {
          date: '01/01/2024',
          narration: 'Test',
          withdrawlAmount: '100',
          depositAmount: '',
          closingBalance: 1000,
          refNumber: 'REF001',
          valueDate: '01/01/2024',
          isCash: false,
        },
      ];
      await expect(service.uploadLogsFromFile(logs, '')).rejects.toThrow(ClientError);
      await expect(service.uploadLogsFromFile(logs, '')).rejects.toThrow(
        'Bank name is required and must be a non-empty string.'
      );
    });

    it('should upload unique logs successfully and skip duplicates', async () => {
      const logs = [
        {
          date: '01/01/2024',
          narration: 'Grocery Shopping',
          withdrawlAmount: '500',
          depositAmount: '',
          refNumber: 'REF123',
          closingBalance: 10000,
          valueDate: '01/01/2024',
          isCash: false,
        },
        {
          date: '02/01/2024',
          narration: 'Salary Credit',
          withdrawlAmount: '',
          depositAmount: '50000',
          refNumber: 'SAL001',
          closingBalance: 60000,
          valueDate: '02/01/2024',
          isCash: false,
        },
      ];

      // Mock no duplicates found
      (TransactionLogs.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      (TransactionLogs.insertMany as jest.Mock).mockResolvedValue([{}, {}]);

      const result = await service.uploadLogsFromFile(logs, 'HDFC Bank');

      expect(result.inserted).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.uploadKey).toBeTruthy();
      expect(TransactionLogs.insertMany).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate logs and only insert unique ones', async () => {
      const logs = [
        {
          date: '01/01/2024',
          narration: 'Grocery',
          withdrawlAmount: '500',
          depositAmount: '',
          refNumber: 'REF123',
          closingBalance: 9500,
          valueDate: '01/01/2024',
          isCash: false,
        },
        {
          date: '02/01/2024',
          narration: 'Salary',
          withdrawlAmount: '',
          depositAmount: '50000',
          refNumber: 'SAL001',
          closingBalance: 59500,
          valueDate: '02/01/2024',
          isCash: false,
        },
      ];

      // Mock one duplicate found (first log)
      (TransactionLogs.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ hashMap: '01012024-grocery-ref123--500' }]),
      });

      (TransactionLogs.insertMany as jest.Mock).mockResolvedValue([{}]);

      const result = await service.uploadLogsFromFile(logs, 'HDFC Bank');

      expect(result.inserted).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.uploadKey).toBeTruthy();
    });

    it('should return null uploadKey when all logs are duplicates', async () => {
      const logs = [
        {
          date: '01/01/2024',
          narration: 'Grocery',
          withdrawlAmount: '500',
          depositAmount: '',
          refNumber: 'REF123',
          closingBalance: 9500,
          valueDate: '01/01/2024',
          isCash: false,
        },
      ];

      // Mock duplicate found
      (TransactionLogs.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ hashMap: '01012024-grocery-ref123--500' }]),
      });

      const result = await service.uploadLogsFromFile(logs, 'HDFC Bank');

      expect(result.inserted).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.uploadKey).toBeNull();
      expect(TransactionLogs.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('previewUploadFromFile', () => {
    it('should throw ClientError when rows array is empty', async () => {
      await expect(service.previewUploadFromFile([], 'HDFC')).rejects.toThrow(ClientError);
    });

    it('should return preview with toInsert and toSkip arrays', async () => {
      const rows = [
        {
          date: '01/01/2024',
          narration: 'Grocery',
          withdrawlAmount: '500',
          depositAmount: '',
          refNumber: 'REF123',
          closingBalance: 9500,
          valueDate: '01/01/2024',
          isCash: false,
        },
        {
          date: '02/01/2024',
          narration: 'Salary',
          withdrawlAmount: '',
          depositAmount: '50000',
          refNumber: 'SAL001',
          closingBalance: 59500,
          valueDate: '02/01/2024',
          isCash: false,
        },
      ];

      // Mock one duplicate
      (TransactionLogs.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([{ hashMap: '01012024-grocery-ref123--500' }]),
      });

      const result = await service.previewUploadFromFile(rows, 'HDFC Bank');

      expect(result.toInsert).toHaveLength(1);
      expect(result.toSkip).toHaveLength(1);
      expect(result.toSkip[0].narration).toBe('Grocery');
      expect(result.toInsert[0].narration).toBe('Salary');
    });
  });

  describe('fetchTransactionLogs', () => {
    it('should fetch transactions with default filters', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      const result = await service.fetchTransactionLogs(1, 10);

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(
        1,
        10,
        '500', // amount
        '2024-01-01', // dateFrom
        '2024-01-31', // dateTo
        'HDFC', // bankName
        'online', // transactionType
        'debit', // type
        'food,groceries', // labels
        'Food' // category
      );

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              userId: mockUserId,
              status: 'PENDING',
              amount: 500,
              bankName: expect.objectContaining({ $regex: 'HDFC' }),
              isCash: false,
              isCredit: false,
              label: expect.objectContaining({ $in: 'food,groceries' }),
              category: expect.objectContaining({ $in: 'Food' }),
            }),
          }),
        ])
      );
    });

    it('should filter by keyword across multiple fields', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'grocery' // keyword
      );

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      const matchStage = callArgs[1].find((stage: any) => stage.$match);
      expect(matchStage.$match.$or).toBeDefined();
      expect(matchStage.$match.$or).toEqual(
        expect.arrayContaining([
          { narration: expect.objectContaining({ $regex: 'grocery' }) },
          { notes: expect.objectContaining({ $regex: 'grocery' }) },
        ])
      );
    });
  });

  describe('getUploadKey', () => {
    it('should return upload keys with counts', async () => {
      const mockUploadKeys = [
        { uploadKey: 'key-1', count: 10 },
        { uploadKey: 'key-2', count: 5 },
      ];

      (TransactionLogs.aggregate as jest.Mock).mockResolvedValue(mockUploadKeys);

      const result = await service.getUploadKey();

      expect(result).toEqual(mockUploadKeys);
      expect(TransactionLogs.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { userId: mockUserId, status: 'PENDING' } },
          { $group: { _id: '$uploadKey', count: { $sum: 1 } } },
          { $project: { uploadKey: '$_id', count: 1 } },
        ])
      );
    });
  });

  describe('updateBulkLogs', () => {
    it('should throw error when transactions array is empty', async () => {
      await expect(service.updateBulkLogs([], 'upload-key-1')).rejects.toThrow(CustomError);
      await expect(service.updateBulkLogs([], 'upload-key-1')).rejects.toThrow(
        'No transactions provided for update.'
      );
    });

    it('should update multiple transactions successfully', async () => {
      const transactions = [
        {
          _id: new Types.ObjectId().toString(),
          notes: 'Updated note 1',
          label: ['food'],
          category: 'Food',
        } as any,
        {
          _id: new Types.ObjectId().toString(),
          notes: 'Updated note 2',
          label: ['travel'],
          category: 'Travel',
        } as any,
      ];

      (TransactionLogs.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const result = await service.updateBulkLogs(transactions, 'upload-key-1');

      expect(result).toBe('Transactions updated successfully.');
      expect(TransactionLogs.bulkWrite).toHaveBeenCalledTimes(1);
    });

    it('should update bankName for all transactions with uploadKey', async () => {
      const transactions = [
        {
          _id: new Types.ObjectId().toString(),
          notes: 'Note',
        } as any,
      ];

      (TransactionLogs.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (TransactionLogs.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 10 });

      await service.updateBulkLogs(transactions, 'upload-key-1', 'New Bank Name');

      expect(TransactionLogs.updateMany).toHaveBeenCalledWith(
        { uploadKey: 'upload-key-1', userId: mockUserId },
        { $set: { bankName: 'New Bank Name' } }
      );
    });
  });

  describe('updateSingleLog', () => {
    it('should throw error when transaction not found', async () => {
      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSingleLog('507f1f77bcf86cd799439011', {
          notes: 'Updated',
        } as any)
      ).rejects.toThrow('Transaction log not found.');
    });

    it('should update transaction successfully', async () => {
      const mockTransaction = {
        _id: new Types.ObjectId(),
        notes: 'Old note',
        category: 'Food',
      };

      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(mockTransaction);
      (Labels.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (Labels.bulkWrite as jest.Mock).mockResolvedValue({});
      (Category.findOne as jest.Mock).mockResolvedValue(null);
      (Category.create as jest.Mock).mockResolvedValue({});
      (TransactionLogs.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        notes: 'Updated note',
      });

      const result = await service.updateSingleLog(mockTransaction._id.toString(), {
        notes: 'Updated note',
        label: ['food', 'groceries'],
        category: 'Food',
      } as any);

      expect(result.notes).toBe('Updated note');
      expect(TransactionLogs.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should upsert labels when updating transaction', async () => {
      const mockTransaction = { _id: new Types.ObjectId() };

      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(mockTransaction);
      (Labels.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (Labels.bulkWrite as jest.Mock).mockResolvedValue({});
      (TransactionLogs.findOneAndUpdate as jest.Mock).mockResolvedValue(mockTransaction);

      await service.updateSingleLog(mockTransaction._id.toString(), {
        label: ['new-label'],
      } as any);

      expect(Labels.find).toHaveBeenCalled();
      expect(Labels.bulkWrite).toHaveBeenCalled();
    });

    it('should create new category if not exists', async () => {
      const mockTransaction = { _id: new Types.ObjectId() };

      (TransactionLogs.findOne as jest.Mock).mockResolvedValue(mockTransaction);
      (Category.findOne as jest.Mock).mockResolvedValue(null);
      (Category.create as jest.Mock).mockResolvedValue({ categoryName: 'newcategory' });
      (TransactionLogs.findOneAndUpdate as jest.Mock).mockResolvedValue(mockTransaction);

      await service.updateSingleLog(mockTransaction._id.toString(), {
        category: 'NewCategory',
      } as any);

      expect(Category.findOne).toHaveBeenCalledWith({
        categoryName: 'newcategory',
        createdBy: mockUserId,
      });
      expect(Category.create).toHaveBeenCalledWith({
        categoryName: 'newcategory',
        createdBy: mockUserId,
      });
    });
  });

  describe('syncTransactionsWithDB', () => {
    it('should throw error when transactions array is empty', async () => {
      await expect(service.syncTransactionsWithDB([], 1, 10)).rejects.toThrow(
        'No transactions found'
      );
    });

    it('should sync transactions and return paginated results', async () => {
      const transactions = [
        {
          _id: new Types.ObjectId(),
          narration: 'Test',
          amount: 100,
          label: ['food'],
        },
      ];

      (Labels.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (Labels.bulkWrite as jest.Mock).mockResolvedValue({});
      (TransactionLogs.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: transactions,
          pagination: { total: 1, page: 1, limit: 10 },
        }),
      };

      const result = await service.syncTransactionsWithDB(transactions as any, 1, 10);

      expect(TransactionLogs.bulkWrite).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('listLabelsService', () => {
    it('should return all labels for user', async () => {
      const mockLabels = [
        { labelName: 'food', createdBy: mockUserId },
        { labelName: 'travel', createdBy: mockUserId },
      ];

      (Labels.find as jest.Mock).mockResolvedValue(mockLabels);

      const result = await service.listLabelsService();

      expect(result).toEqual(mockLabels);
      expect(Labels.find).toHaveBeenCalledWith({ createdBy: mockUserId });
    });
  });

  describe('listCategoriesService', () => {
    it('should return all categories for user', async () => {
      const mockCategories = [
        { categoryName: 'food', createdBy: mockUserId },
        { categoryName: 'travel', createdBy: mockUserId },
      ];

      (Category.find as jest.Mock).mockResolvedValue(mockCategories);

      const result = await service.listCategoriesService();

      expect(result).toEqual(mockCategories);
      expect(Category.find).toHaveBeenCalledWith({ createdBy: mockUserId });
    });
  });

  describe('deleteAllTransactionsService', () => {
    it('should delete all transactions, categories, and labels', async () => {
      (Category.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });
      (Labels.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 10 });
      (TransactionLogs.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 100 });

      const result = await service.deleteAllTransactionsService();

      expect(result).toBe('Logs deleted successfully');
      expect(Category.deleteMany).toHaveBeenCalledWith({ createdBy: mockUserId });
      expect(Labels.deleteMany).toHaveBeenCalledWith({ createdBy: mockUserId });
      expect(TransactionLogs.deleteMany).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('addCashMemoService', () => {
    it('should add cash transaction successfully', async () => {
      const transaction = {
        narration: 'Cash payment',
        amount: 500,
        transactionDate: '01/01/2024',
        isCredit: false,
      };

      const mockSavedTransaction = {
        ...transaction,
        _id: new Types.ObjectId(),
        userId: mockUserId,
        isCash: true,
      };

      const mockSave = jest.fn().mockResolvedValue(mockSavedTransaction);
      (TransactionLogs as any).mockImplementation(() => ({
        ...mockSavedTransaction,
        save: mockSave,
      }));

      const result = await service.addCashMemoService(transaction as any);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error when save fails', async () => {
      const transaction = {
        narration: 'Cash payment',
        amount: 500,
        transactionDate: '01/01/2024',
      };

      const mockFailedSave = {
        save: jest.fn().mockResolvedValue(null),
      };

      (TransactionLogs as any).mockImplementation(() => mockFailedSave);

      await expect(service.addCashMemoService(transaction as any)).rejects.toThrow(
        'Something went wrong while adding the transaction'
      );
    });
  });
});
