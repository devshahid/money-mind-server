/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { DebtService } from '../debt.service';
import { Debt, IDebtDetails } from '../models/debts.model';
import { DebtPayment } from '../models/debt-payment.model';
import { CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/debts.model');
jest.mock('../models/debt-payment.model');
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
      expect(result.remainingBalance).toBe(350000);
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
          lender: 'HDFC Bank',
          interestRate: 15,
          startDate: new Date(),
          expectedEndDate: new Date(),
          monthlyExpectedEMI: 5000,
          debtStatus: 'ACTIVE',
          paymentDate: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.getDebtService(debtId.toString(), mockUserId);

      expect(result.debtName).toBe('Credit Card Debt');
      expect(result.principal).toBe(50000);
      expect(result.remainingBalance).toBe(30000);
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
            lender: 'SBI',
            interestRate: 8.5,
            startDate: new Date(),
            expectedEndDate: new Date(),
            monthlyExpectedEMI: 40000,
            debtStatus: 'ACTIVE',
            paymentDate: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Car Loan',
            totalAmount: 800000,
            remainingAmount: 600000,
            lender: 'HDFC',
            interestRate: 9,
            startDate: new Date(),
            expectedEndDate: new Date(),
            monthlyExpectedEMI: 15000,
            debtStatus: 'ACTIVE',
            paymentDate: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (Debt.find as jest.Mock).mockResolvedValue(mockDebts);

      const result = await service.listDebtService(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].debtName).toBe('Home Loan');
      expect(result[0].principal).toBe(5000000);
      expect(result[1].debtName).toBe('Car Loan');
      expect(Debt.find).toHaveBeenCalledWith({ userId: mockUserId });
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

  describe('recordPaymentService', () => {
    it('should record payment and update remaining amount', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Car Loan',
          totalAmount: 500000,
          remainingAmount: 400000,
          debtStatus: 'ACTIVE',
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const mockPayment = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        debtId,
        amount: 50000,
        paymentDate: new Date(),
      };

      const mockSave = jest.fn().mockResolvedValue(mockPayment);
      (DebtPayment as any).mockImplementation(() => ({
        ...mockPayment,
        save: mockSave,
      }));

      const updatedDebt = {
        ...mockDebt,
        debtDetails: {
          ...mockDebt.debtDetails,
          remainingAmount: 350000,
        },
      };

      (Debt.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedDebt);

      const result = await service.recordPaymentService(
        {
          debtId: debtId.toString(),
          amount: 50000,
          paymentDate: new Date(),
        },
        mockUserId
      );

      expect(result.payment).toBeDefined();
      expect(result.updatedDebt.remainingBalance).toBe(350000);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should mark debt as PAID when fully paid', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Personal Loan',
          totalAmount: 100000,
          remainingAmount: 25000,
          debtStatus: 'ACTIVE',
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const mockPayment = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        debtId,
        amount: 25000,
        paymentDate: new Date(),
      };

      const mockSave = jest.fn().mockResolvedValue(mockPayment);
      (DebtPayment as any).mockImplementation(() => ({
        ...mockPayment,
        save: mockSave,
      }));

      const updatedDebt = {
        ...mockDebt,
        debtDetails: {
          ...mockDebt.debtDetails,
          remainingAmount: 0,
          debtStatus: 'PAID',
        },
      };

      (Debt.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedDebt);

      const result = await service.recordPaymentService(
        {
          debtId: debtId.toString(),
          amount: 25000,
          paymentDate: new Date(),
        },
        mockUserId
      );

      expect(result.updatedDebt.status).toBe('PAID');
      expect(result.updatedDebt.remainingBalance).toBe(0);
    });

    it('should throw error when debt not found', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.recordPaymentService(
          {
            debtId: new Types.ObjectId().toString(),
            amount: 10000,
            paymentDate: new Date(),
          },
          mockUserId
        )
      ).rejects.toThrow('Debt not found');
    });

    it('should throw error when payment amount is invalid', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          remainingAmount: 100000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      await expect(
        service.recordPaymentService(
          {
            debtId: debtId.toString(),
            amount: 0,
            paymentDate: new Date(),
          },
          mockUserId
        )
      ).rejects.toThrow('Payment amount must be greater than 0');

      await expect(
        service.recordPaymentService(
          {
            debtId: debtId.toString(),
            amount: 150000,
            paymentDate: new Date(),
          },
          mockUserId
        )
      ).rejects.toThrow('Payment amount cannot exceed remaining amount');
    });
  });

  describe('getPaymentHistoryService', () => {
    it('should return payment history for a debt', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Home Loan',
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const mockPayments = [
        {
          _id: new Types.ObjectId(),
          debtId,
          amount: 50000,
          paymentDate: new Date('2024-01-15'),
        },
        {
          _id: new Types.ObjectId(),
          debtId,
          amount: 50000,
          paymentDate: new Date('2024-02-15'),
        },
      ];

      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockPayments),
        }),
      });

      (DebtPayment.find as jest.Mock) = mockFind;

      const result = await service.getPaymentHistoryService(debtId.toString(), mockUserId);

      expect(result.payments).toHaveLength(2);
      expect(result.totalPaid).toBe(100000);
      expect(result.paymentCount).toBe(2);
    });

    it('should throw error when debt not found', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPaymentHistoryService(new Types.ObjectId().toString(), mockUserId)
      ).rejects.toThrow('Debt not found');
    });
  });

  describe('getPayoffProjectionService', () => {
    it('should calculate payoff projection correctly', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Personal Loan',
          remainingAmount: 100000,
          interestRate: 12,
          monthlyExpectedEMI: 10000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.getPayoffProjectionService(debtId.toString(), mockUserId);

      expect(result.monthlyPayment).toBe(10000);
      expect(result.totalMonths).toBeGreaterThan(0);
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.monthlyBreakdown).toBeDefined();
      expect(result.payoffDate).toBeInstanceOf(Date);
    });

    it('should handle zero interest rate', async () => {
      const debtId = new Types.ObjectId();
      const mockDebt = {
        _id: debtId,
        userId: mockUserId,
        debtDetails: {
          debtName: 'Interest-free Loan',
          remainingAmount: 100000,
          interestRate: 0,
          monthlyExpectedEMI: 10000,
        },
      };

      (Debt.findOne as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.getPayoffProjectionService(debtId.toString(), mockUserId);

      expect(result.monthlyPayment).toBe(10000);
      expect(result.totalMonths).toBe(10);
      expect(result.totalInterest).toBe(0);
    });

    it('should throw error when debt not found', async () => {
      (Debt.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPayoffProjectionService(new Types.ObjectId().toString(), mockUserId)
      ).rejects.toThrow('Debt not found');
    });
  });

  describe('getDebtSummaryService', () => {
    it('should calculate comprehensive debt summary', async () => {
      const mockDebts = [
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Home Loan',
            totalAmount: 5000000,
            remainingAmount: 4500000,
            monthlyExpectedEMI: 40000,
            debtStatus: 'ACTIVE',
            interestRate: 8.5,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Car Loan',
            totalAmount: 800000,
            remainingAmount: 0,
            monthlyExpectedEMI: 15000,
            debtStatus: 'PAID',
            interestRate: 7.0,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          debtDetails: {
            debtName: 'Personal Loan',
            totalAmount: 200000,
            remainingAmount: 100000,
            monthlyExpectedEMI: 5000,
            debtStatus: 'ACTIVE',
            interestRate: 12.0,
          },
        },
      ];

      (Debt.find as jest.Mock).mockResolvedValue(mockDebts);

      const result = await service.getDebtSummaryService(mockUserId);

      expect(result.totalDebt).toBe(6000000);
      expect(result.totalRemaining).toBe(4600000);
      expect(result.totalMonthlyEMI).toBe(45000); // Only active debts
      expect(result.totalPaid).toBe(1400000);
      expect(result.activeDebtsCount).toBe(2);
      expect(result.paidDebtsCount).toBe(1);
      expect(result.overallProgress).toBeCloseTo(23.33, 2);
      expect(result.highestInterestDebt).toEqual({
        debtName: 'Personal Loan',
        interestRate: 12.0,
        remaining: 100000,
      });
      expect(result.debts).toHaveLength(3);
    });

    it('should return empty summary when no debts', async () => {
      (Debt.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getDebtSummaryService(mockUserId);

      expect(result.totalDebt).toBe(0);
      expect(result.totalRemaining).toBe(0);
      expect(result.totalMonthlyEMI).toBe(0);
      expect(result.totalPaid).toBe(0);
      expect(result.activeDebtsCount).toBe(0);
      expect(result.paidDebtsCount).toBe(0);
      expect(result.overallProgress).toBe(0);
      expect(result.highestInterestDebt).toBeNull();
      expect(result.debts).toHaveLength(0);
    });
  });
});
