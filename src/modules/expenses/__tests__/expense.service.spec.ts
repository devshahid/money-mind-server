/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { ExpenseService } from '../expense.service';
import { Expense, ICategoryItems } from '../models/expense.model';
import { Category } from '../../transactions/models/category.model';
import { CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/expense.model');
jest.mock('../../transactions/models/category.model');
jest.mock('../../../utils/common');

describe('ExpenseService (Unit Tests)', () => {
  let service: ExpenseService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpenseService();
  });

  describe('createCategoryService', () => {
    it('should throw error when category already exists', async () => {
      const existingCategory = {
        _id: new Types.ObjectId(),
        categoryName: 'Utilities',
        userId: mockUserId,
      };

      (Category.findOne as jest.Mock).mockResolvedValue(existingCategory);

      const items: ICategoryItems = {
        itemName: 'Electricity',
        expectedAmount: 2000,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 5,
        paymentDate: new Date('2024-01-05'),
        recurring: 'MONTHLY',
      };

      await expect(service.createCategoryService('Utilities', items, mockUserId)).rejects.toThrow(
        'Category already exists'
      );
      await expect(service.createCategoryService('Utilities', items, mockUserId)).rejects.toThrow(
        CustomError
      );
    });

    it('should create category and expense items successfully', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Subscriptions',
        userId: mockUserId,
      };

      const mockSave = jest.fn().mockResolvedValue(mockCategory);
      (Category as any).mockImplementation(() => ({
        ...mockCategory,
        save: mockSave,
      }));

      const expenseId = new Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        userId: mockUserId,
        categoryId: categoryId,
      };

      const mockExpenseSave = jest.fn().mockResolvedValue(mockExpense);
      (Expense as any).mockImplementation(() => ({
        ...mockExpense,
        save: mockExpenseSave,
      }));

      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);

      const items: ICategoryItems = {
        itemName: 'Netflix',
        expectedAmount: 500,
        actualAmount: 500,
        isPaid: true,
        expenseFixedDate: 1,
        paymentDate: new Date('2024-01-01'),
        recurring: 'MONTHLY',
      };

      const result = await service.createCategoryService('Subscriptions', items, mockUserId);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
      expect(mockExpenseSave).toHaveBeenCalled();
    });

    it('should throw error when category save fails', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(null);
      (Category as any).mockImplementation(() => ({
        save: mockSave,
      }));

      const items: ICategoryItems = {
        itemName: 'Water Bill',
        expectedAmount: 500,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 10,
        paymentDate: new Date('2024-01-10'),
        recurring: 'MONTHLY',
      };

      await expect(service.createCategoryService('Utilities', items, mockUserId)).rejects.toThrow(
        'Something went wrong while creating the category'
      );
    });

    it('should throw error when expense items save fails', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Transportation',
        userId: mockUserId,
      };

      const mockSave = jest.fn().mockResolvedValue(mockCategory);
      (Category as any).mockImplementation(() => ({
        ...mockCategory,
        save: mockSave,
      }));

      const mockExpenseSave = jest.fn().mockResolvedValue(null);
      (Expense as any).mockImplementation(() => ({
        save: mockExpenseSave,
      }));

      const items: ICategoryItems = {
        itemName: 'Fuel',
        expectedAmount: 5000,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 15,
        paymentDate: new Date('2024-01-15'),
        recurring: 'MONTHLY',
      };

      await expect(
        service.createCategoryService('Transportation', items, mockUserId)
      ).rejects.toThrow('Something went wrong while creating the category');
    });

    it('should throw error when fetching details fails', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Healthcare',
        userId: mockUserId,
      };

      const mockSave = jest.fn().mockResolvedValue(mockCategory);
      (Category as any).mockImplementation(() => ({
        ...mockCategory,
        save: mockSave,
      }));

      const expenseId = new Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        userId: mockUserId,
        categoryId: categoryId,
      };

      const mockExpenseSave = jest.fn().mockResolvedValue(mockExpense);
      (Expense as any).mockImplementation(() => ({
        ...mockExpense,
        save: mockExpenseSave,
      }));

      (Category.findById as jest.Mock).mockResolvedValue(null);
      (Expense.findById as jest.Mock).mockResolvedValue(mockExpense);

      const items: ICategoryItems = {
        itemName: 'Insurance',
        expectedAmount: 3000,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 20,
        paymentDate: new Date('2024-01-20'),
        recurring: 'MONTHLY',
      };

      await expect(service.createCategoryService('Healthcare', items, mockUserId)).rejects.toThrow(
        'Something went wrong while fetching details'
      );
    });
  });

  describe('addItemsInCategoryService', () => {
    it('should throw error when category not found', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const items: ICategoryItems = {
        itemName: 'New Item',
        expectedAmount: 1000,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 5,
        paymentDate: new Date('2024-01-05'),
        recurring: 'MONTHLY',
      };

      await expect(
        service.addItemsInCategoryService('507f1f77bcf86cd799439011', items, mockUserId)
      ).rejects.toThrow('Category not found');
      await expect(
        service.addItemsInCategoryService('507f1f77bcf86cd799439011', items, mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should add items to existing category successfully', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Entertainment',
        userId: mockUserId,
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const mockExpense = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        categoryId: categoryId,
      };

      const mockSave = jest.fn().mockResolvedValue(mockExpense);
      (Expense as any).mockImplementation(() => ({
        ...mockExpense,
        save: mockSave,
      }));

      const items: ICategoryItems = {
        itemName: 'Amazon Prime',
        expectedAmount: 1500,
        actualAmount: 1500,
        isPaid: true,
        expenseFixedDate: 1,
        paymentDate: new Date('2024-01-01'),
        recurring: 'YEARLY',
      };

      const result = await service.addItemsInCategoryService(
        categoryId.toString(),
        items,
        mockUserId
      );

      expect(result).toBe('Item added successfully');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error when adding items fails', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Food',
        userId: mockUserId,
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const mockSave = jest.fn().mockResolvedValue(null);
      (Expense as any).mockImplementation(() => ({
        save: mockSave,
      }));

      const items: ICategoryItems = {
        itemName: 'Groceries',
        expectedAmount: 10000,
        actualAmount: 0,
        isPaid: false,
        expenseFixedDate: 1,
        paymentDate: new Date('2024-01-01'),
        recurring: 'MONTHLY',
      };

      await expect(
        service.addItemsInCategoryService(categoryId.toString(), items, mockUserId)
      ).rejects.toThrow('Something went wrong while adding items to category');
    });
  });

  describe('deleteCategoryService', () => {
    it('should throw error when category not found', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteCategoryService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow('Category not found');
      await expect(
        service.deleteCategoryService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should delete category and all its expenses successfully', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Old Category',
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);
      (Expense.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });

      const result = await service.deleteCategoryService(categoryId.toString(), mockUserId);

      expect(result).toBeDefined();
      expect(mockCategory.deleteOne).toHaveBeenCalled();
      expect(Expense.deleteMany).toHaveBeenCalledWith({
        categoryId: undefined,
        userId: mockUserId,
      });
    });

    it('should throw error when delete fails', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Test Category',
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue(null),
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      await expect(
        service.deleteCategoryService(categoryId.toString(), mockUserId)
      ).rejects.toThrow('Something went wrong while deleting the category');
    });
  });

  describe('removeItemsFromCategoryService', () => {
    it('should throw error when item not found', async () => {
      (Expense.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeItemsFromCategoryService(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012',
          mockUserId
        )
      ).rejects.toThrow('Category not found');
      await expect(
        service.removeItemsFromCategoryService(
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012',
          mockUserId
        )
      ).rejects.toThrow(CustomError);
    });

    it('should remove item from category successfully', async () => {
      const categoryId = new Types.ObjectId();
      const itemId = new Types.ObjectId();

      const mockExpense = {
        _id: itemId,
        categoryId: categoryId,
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (Expense.findOne as jest.Mock).mockResolvedValue(mockExpense);

      const result = await service.removeItemsFromCategoryService(
        categoryId.toString(),
        itemId.toString(),
        mockUserId
      );

      expect(result).toBeDefined();
      expect(mockExpense.deleteOne).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const categoryId = new Types.ObjectId();
      const itemId = new Types.ObjectId();

      const mockExpense = {
        _id: itemId,
        categoryId: categoryId,
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue(null),
      };

      (Expense.findOne as jest.Mock).mockResolvedValue(mockExpense);

      await expect(
        service.removeItemsFromCategoryService(categoryId.toString(), itemId.toString(), mockUserId)
      ).rejects.toThrow('Something went wrong while deleting the item');
    });
  });

  describe('updateCategoryService', () => {
    it('should throw error when category not found', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCategoryService('507f1f77bcf86cd799439011', 'New Name', mockUserId)
      ).rejects.toThrow('Category not found');
      await expect(
        service.updateCategoryService('507f1f77bcf86cd799439011', 'New Name', mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should update category name successfully', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Old Name',
        userId: mockUserId,
        save: jest.fn().mockResolvedValue({
          _id: categoryId,
          categoryName: 'New Name',
          userId: mockUserId,
        }),
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const result = await service.updateCategoryService(
        categoryId.toString(),
        'New Name',
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.categoryName).toBe('New Name');
      expect(mockCategory.save).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      const categoryId = new Types.ObjectId();
      const mockCategory = {
        _id: categoryId,
        categoryName: 'Test',
        userId: mockUserId,
        save: jest.fn().mockResolvedValue(null),
      };

      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      await expect(
        service.updateCategoryService(categoryId.toString(), 'Updated Name', mockUserId)
      ).rejects.toThrow('Something went wrong while updating the category');
    });
  });

  describe('listAllExpenseService', () => {
    it('should return aggregated expenses grouped by category', async () => {
      const mockAggregateResult = [
        {
          categoryId: new Types.ObjectId(),
          categoryName: 'Subscriptions',
          items: [
            {
              _id: new Types.ObjectId(),
              itemName: 'Netflix',
              expectedAmount: 500,
              actualAmount: 500,
              isPaid: true,
              expenseFixedDate: 1,
              paymentDate: new Date('2024-01-01'),
              recurring: 'MONTHLY',
            },
            {
              _id: new Types.ObjectId(),
              itemName: 'Spotify',
              expectedAmount: 200,
              actualAmount: 200,
              isPaid: true,
              expenseFixedDate: 5,
              paymentDate: new Date('2024-01-05'),
              recurring: 'MONTHLY',
            },
          ],
        },
        {
          categoryId: new Types.ObjectId(),
          categoryName: 'Utilities',
          items: [
            {
              _id: new Types.ObjectId(),
              itemName: 'Electricity',
              expectedAmount: 2000,
              actualAmount: 1800,
              isPaid: true,
              expenseFixedDate: 10,
              paymentDate: new Date('2024-01-10'),
              recurring: 'MONTHLY',
            },
          ],
        },
      ];

      (Expense.aggregate as jest.Mock).mockResolvedValue(mockAggregateResult);

      const result = await service.listAllExpenseService(mockUserId);

      expect(result).toEqual(mockAggregateResult);
      expect(result).toHaveLength(2);
      expect(result[0].items).toHaveLength(2);
      expect(result[1].items).toHaveLength(1);
      expect(Expense.aggregate).toHaveBeenCalled();
    });

    it('should return empty array when user has no expenses', async () => {
      (Expense.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await service.listAllExpenseService(mockUserId);

      expect(result).toEqual([]);
      expect(Expense.aggregate).toHaveBeenCalled();
    });

    it('should use correct aggregation pipeline', async () => {
      (Expense.aggregate as jest.Mock).mockResolvedValue([]);

      await service.listAllExpenseService(mockUserId);

      expect(Expense.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { userId: mockUserId } },
          expect.objectContaining({
            $lookup: expect.objectContaining({
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            }),
          }),
          { $unwind: '$categoryInfo' },
          expect.objectContaining({ $group: expect.any(Object) }),
          expect.objectContaining({ $project: expect.any(Object) }),
        ])
      );
    });
  });
});
