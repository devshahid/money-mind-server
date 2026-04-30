/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { DebtService } from '../debt.service';
import { Debt, IDebtDetails } from '../models/debts.model';
import { CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/debts.model');
jest.mock('../../../utils/common');

describe('DebtService (Unit Tests)', () => {
  let service: DebtService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DebtService();
  });

  describe('addDebtService', () => {
    it('should create a new debt successfully', async () => {
      const debtDetails: IDebtDetails = {
        debtName: 'Home Loan',
        startDate: new Date('2024-01-01'),
        expectedEndDate: new Date('2044-01-01'),
        totalAmount: 5000000,
        remainingAmount: 4800000,
        interestRate: 8.5,
        debtStatus: 'ACTIVE',
        monthlyExpectedEMI: 40000,
        monthlyActualEMI: 40000,
        partPayment: 0,
        paymentDate: new Date('2024-01-05'),
        lender: 'HDFC Bank',
      };

      const mockDebt = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        debtDetails,
      };

      const mockSave = jest.fn().mockResolvedValue(mockDebt);
      (Debt as any).mockImplementation(() => ({
        ...mockDebt,
        save: mockSave,
      }));

      const result = await service.addDebtService(debtDetails, mockUserId);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error when save fails', async () => {
      const debtDetails: IDebtDetails = {
        debtName: 'Personal Loan',
        startDate: new Date('2024-01-01'),
        expectedEndDate: new Date('2027-01-01'),
        totalAmount: 100000,
        remainingAmount: 80000,
        interestRate: 12,
        debtStatus: 'ACTIVE',
        monthlyExpectedEMI: 3000,
        monthlyActualEMI: 3000,
        partPayment: 0,
        paymentDate: new Date('2024-01-10'),
        lender: 'ICICI Bank',
      };

      const mockSave = jest.fn().mockResolvedValue(null);
      (Debt as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(service.addDebtService(debtDetails, mockUserId)).rejects.toThrow(
        'Something went wrong while creating the debt'
      );
      await expect(service.addDebtService(debtDetails, mockUserId)).rejects.toThrow(CustomError);
    });
  });

  describe('updateDebtService', () => {
    it('should throw error when debt does not exist', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      const debtDetails: IDebtDetails = {
        debtName: 'Updated Loan',
      } as any;

      await expect(
        service.updateDebtService('507f1f77bcf86cd799439011', debtDetails, mockUserId)
      ).rejects.toThrow('Debt not exist');
      await expect(
        service.updateDebtService('507f1f77bcf86cd799439011', debtDetails, mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should update debt successfully', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Car Loan',
          totalAmount: 500000,
          remainingAmount: 400000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const updatedDebt = {
        ...mockDebt,
        debtDetails: {
          ...mockDebt.debtDetails,
          remainingAmount: 350000,
        },
      };

      (Debt.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedDebt);

      const updateData: IDebtDetails = {
        remainingAmount: 350000,
      } as any;

      const result = await service.updateDebtService(debtId.toString(), updateData, mockUserId);

      expect(result).toBeDefined();
      expect(result.debtDetails.remainingAmount).toBe(350000);
      expect(Debt.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: debtId, userId: mockUserId },
        {
          $set: {
            'debtDetails.remainingAmount': 350000,
          },
        },
        { new: true }
      );
    });

    it('should update multiple debt fields', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Education Loan',
          totalAmount: 1000000,
          remainingAmount: 800000,
          debtStatus: 'ACTIVE',
          monthlyActualEMI: 15000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const updatedDebt = {
        ...mockDebt,
        debtDetails: {
          ...mockDebt.debtDetails,
          debtName: 'Education Loan - Updated',
          remainingAmount: 750000,
          monthlyActualEMI: 20000,
        },
      };

      (Debt.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedDebt);

      const updateData: IDebtDetails = {
        debtName: 'Education Loan - Updated',
        remainingAmount: 750000,
        monthlyActualEMI: 20000,
      } as any;

      const result = await service.updateDebtService(debtId.toString(), updateData, mockUserId);

      expect(result).toBeDefined();
      expect(Debt.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: debtId, userId: mockUserId },
        {
          $set: {
            'debtDetails.debtName': 'Education Loan - Updated',
            'debtDetails.remainingAmount': 750000,
            'debtDetails.monthlyActualEMI': 20000,
          },
        },
        { new: true }
      );
    });

    it('should throw error when update fails', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);
      (Debt.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      const updateData: IDebtDetails = {
        remainingAmount: 100000,
      } as any;

      await expect(
        service.updateDebtService(debtId.toString(), updateData, mockUserId)
      ).rejects.toThrow('Something went wrong while updating the debt');
      await expect(
        service.updateDebtService(debtId.toString(), updateData, mockUserId)
      ).rejects.toThrow(CustomError);
    });
  });

  describe('getDebtService', () => {
    it('should return debt by id', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Credit Card Debt',
          totalAmount: 50000,
          remainingAmount: 30000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.getDebtService(debtId.toString(), mockUserId);

      expect(result).toEqual(mockDebt);
      expect(Debt.findOne).toHaveBeenCalledWith({ _id: undefined, userId: mockUserId });
    });

    it('should throw error when debt not found', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getDebtService('507f1f77bcf86cd799439011', mockUserId)).rejects.toThrow(
        'Debt not exist'
      );
      await expect(service.getDebtService('507f1f77bcf86cd799439011', mockUserId)).rejects.toThrow(
        CustomError
      );
    });
  });

  describe('listDebtService', () => {
    it('should return all debts for user', async () => {
      const mockDebts = [
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Home Loan',
            totalAmount: 5000000,
            remainingAmount: 4500000,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Car Loan',
            totalAmount: 800000,
            remainingAmount: 600000,
          },
        },
      ];

      (Debt.find as jest.Mock).mockResolvedValue(mockDebts);

      const result = await service.listDebtService(mockUserId);

      expect(result).toEqual(mockDebts);
      expect(result).toHaveLength(2);
      expect(Debt.find).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should throw error when no debts found', async () => {
      (Debt.find as jest.Mock).mockResolvedValue(null);

      await expect(service.listDebtService(mockUserId)).rejects.toThrow('No debts found');
      await expect(service.listDebtService(mockUserId)).rejects.toThrow(CustomError);
    });

    it('should return empty array when user has no debts', async () => {
      (Debt.find as jest.Mock).mockResolvedValue([]);

      const result = await service.listDebtService(mockUserId);

      expect(result).toEqual([]);
      expect(Debt.find).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('removeDebtService', () => {
    it('should throw error when debt does not exist', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeDebtService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow('Debt not exist');
      await expect(
        service.removeDebtService('507f1f77bcf86cd799439011', mockUserId)
      ).rejects.toThrow(CustomError);
    });

    it('should delete debt successfully', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Personal Loan',
        },
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.removeDebtService(debtId.toString(), mockUserId);

      expect(result).toBe('Debt deleted successfully');
      expect(mockDebt.deleteOne).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      await expect(service.removeDebtService(debtId.toString(), mockUserId)).rejects.toThrow(
        'Something went wrong while removing the debt'
      );
      await expect(service.removeDebtService(debtId.toString(), mockUserId)).rejects.toThrow(
        CustomError
      );
    });
  });
});
