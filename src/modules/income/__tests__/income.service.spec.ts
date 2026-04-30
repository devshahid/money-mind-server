/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { IncomeService } from '../income.service';
import { Income, IncomeSource } from '../models/income.model';
import { CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/income.model');
jest.mock('../../../utils/common');

describe('IncomeService (Unit Tests)', () => {
  let service: IncomeService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncomeService();
  });

  describe('addIncomeService', () => {
    it('should add income successfully', async () => {
      const incomeDetails: IncomeSource = {
        month: 'January',
        year: 2024,
        type: 'Salary',
        sourceName: 'ABC Company',
        amount: 100000,
        receivedDate: new Date('2024-01-05'),
        notes: 'Monthly salary',
      };

      const mockIncome = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        ...incomeDetails,
      };

      const mockSave = jest.fn().mockResolvedValue(mockIncome);
      (Income as any).mockImplementation(() => ({
        ...mockIncome,
        save: mockSave,
      }));

      const result = await service.addIncomeService(incomeDetails, mockUserId);

      expect(result).toBe('Income recorded successfully');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error when save fails', async () => {
      const incomeDetails: IncomeSource = {
        month: 'February',
        year: 2024,
        type: 'Freelance',
        sourceName: 'Client XYZ',
        amount: 50000,
        receivedDate: new Date('2024-02-10'),
      };

      const mockSave = jest.fn().mockResolvedValue(null);
      (Income as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(service.addIncomeService(incomeDetails, mockUserId)).rejects.toThrow(
        'Something went wrong while adding income'
      );
      await expect(service.addIncomeService(incomeDetails, mockUserId)).rejects.toThrow(
        CustomError
      );
    });
  });

  describe('updateIncomeService', () => {
    it('should throw error when income not found', async () => {
      (Income.findOne as jest.Mock).mockResolvedValue(null);

      const incomeDetails: IncomeSource = {
        amount: 110000,
      } as any;

      await expect(
        service.updateIncomeService('507f1f77bcf86cd799439011', incomeDetails, mockUserId)
      ).rejects.toThrow('Income not found');
      await expect(
        service.updateIncomeService('507f1f77bcf86cd799439011', incomeDetails, mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should update income successfully', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
        month: 'March',
        year: 2024,
        type: 'Salary',
        amount: 100000,
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);

      const updatedIncome = {
        ...mockIncome,
        amount: 120000,
      };

      (Income.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedIncome);

      const updateData: IncomeSource = {
        amount: 120000,
      } as any;

      const result = await service.updateIncomeService(incomeId.toString(), updateData, mockUserId);

      expect(result).toBeDefined();
      expect(result.amount).toBe(120000);
      expect(Income.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: undefined, userId: mockUserId },
        {
          $set: {
            amount: 120000,
          },
        },
        { new: true }
      );
    });

    it('should update multiple income fields', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
        month: 'April',
        year: 2024,
        type: 'Salary',
        sourceName: 'Company A',
        amount: 100000,
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);

      const updatedIncome = {
        ...mockIncome,
        sourceName: 'Company B',
        amount: 130000,
        notes: 'Salary increment',
      };

      (Income.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedIncome);

      const updateData: IncomeSource = {
        sourceName: 'Company B',
        amount: 130000,
        notes: 'Salary increment',
      } as any;

      const result = await service.updateIncomeService(incomeId.toString(), updateData, mockUserId);

      expect(result).toBeDefined();
      expect(Income.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: undefined, userId: mockUserId },
        {
          $set: {
            sourceName: 'Company B',
            amount: 130000,
            notes: 'Salary increment',
          },
        },
        { new: true }
      );
    });

    it('should throw error when update fails', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);
      (Income.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      const updateData: IncomeSource = {
        amount: 100000,
      } as any;

      await expect(
        service.updateIncomeService(incomeId.toString(), updateData, mockUserId)
      ).rejects.toThrow('Something went wrong while updating income');
      await expect(
        service.updateIncomeService(incomeId.toString(), updateData, mockUserId)
      ).rejects.toThrow(CustomError);
    });
  });

  describe('listIncomeService', () => {
    it('should return all income for user', async () => {
      const mockIncome = [
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          month: 'January',
          year: 2024,
          type: 'Salary',
          amount: 100000,
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          month: 'January',
          year: 2024,
          type: 'Freelance',
          amount: 30000,
        },
      ];

      (Income.find as jest.Mock).mockResolvedValue(mockIncome);

      const result = await service.listIncomeService(mockUserId);

      expect(result).toEqual(mockIncome);
      expect(result).toHaveLength(2);
      expect(Income.find).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should throw error when no income found', async () => {
      (Income.find as jest.Mock).mockResolvedValue(null);

      await expect(service.listIncomeService(mockUserId)).rejects.toThrow('No income found');
      await expect(service.listIncomeService(mockUserId)).rejects.toThrow(CustomError);
    });

    it('should return empty array when user has no income', async () => {
      (Income.find as jest.Mock).mockResolvedValue([]);

      const result = await service.listIncomeService(mockUserId);

      expect(result).toEqual([]);
      expect(Income.find).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('getIncomeService', () => {
    it('should return income by id', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
        month: 'February',
        year: 2024,
        type: 'Investments',
        sourceName: 'Mutual Funds',
        amount: 25000,
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);

      const result = await service.getIncomeService(incomeId.toString(), mockUserId);

      expect(result).toEqual(mockIncome);
      expect(Income.findOne).toHaveBeenCalledWith({ _id: undefined, userId: mockUserId });
    });

    it('should throw error when income not found', async () => {
      (Income.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getIncomeService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow('Income not found');
      await expect(
        service.getIncomeService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow(CustomError);
    });
  });

  describe('deleteIncomeService', () => {
    it('should throw error when income not found', async () => {
      (Income.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteIncomeService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow('Income not found');
      await expect(
        service.deleteIncomeService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should delete income successfully', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
        month: 'March',
        type: 'Bonus',
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);

      const result = await service.deleteIncomeService(incomeId.toString(), mockUserId);

      expect(result).toBe('Income delete successfully');
      expect(mockIncome.deleteOne).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const incomeId = new Types.ObjectId();
      const mockIncome = {
        _id: incomeId,
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };

      (Income.findOne as jest.Mock).mockResolvedValue(mockIncome);

      await expect(service.deleteIncomeService(incomeId.toString(), mockUserId)).rejects.toThrow(
        'Something went wrong while deleting income'
      );
      await expect(service.deleteIncomeService(incomeId.toString(), mockUserId)).rejects.toThrow(
        CustomError
      );
    });
  });
});
