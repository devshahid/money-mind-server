import { CustomError } from '../core/ApiError';
import { Debt, IDebtDetails } from '../models/debts.model';
import { common } from '../utils/common';
import { Types } from 'mongoose';

class DebtService {
  addDebtService = async (debtDetails: IDebtDetails, userId?: Types.ObjectId) => {
    const debt = new Debt({
      userId,
      debtDetails,
    });
    const createdDebt = await debt.save();
    if (!createdDebt) throw new CustomError('Something went wrong while creating the debt');

    return createdDebt;
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
    return updatedDebt;
  };

  getDebtService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not exist');
    return debt;
  };

  listDebtService = async (userId?: Types.ObjectId) => {
    const debts = await Debt.find({ userId });
    if (!debts) throw new CustomError('No debts found');
    return debts;
  };

  removeDebtService = async (debtId: string, userId?: Types.ObjectId) => {
    const debt = await Debt.findOne({ _id: common.convertToObjectId(debtId), userId });
    if (!debt) throw new CustomError('Debt not exist');
    const deletedData = await debt.deleteOne();
    if (deletedData.deletedCount === 0)
      throw new CustomError('Something went wrong while removing the debt');
    return 'Debt deleted successfully';
  };
}

export { DebtService };
