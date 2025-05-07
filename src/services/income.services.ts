import { CustomError } from '../core/ApiError';
import { Income, IncomeSource } from '../models/income.model';
import { common } from '../utils/common';
import { Types } from 'mongoose';

class IncomeService {
  addIncomeService = async (incomeDetails: IncomeSource, userId?: Types.ObjectId) => {
    const income = new Income({ ...incomeDetails, userId });
    const addedIncome = await income.save();
    if (!addedIncome) throw new CustomError('Something went wrong while adding income');
    return 'Income recorded successfully';
  };

  updateIncomeService = async (
    incomeId: string,
    incomeDetails: IncomeSource,
    userId?: Types.ObjectId
  ) => {
    const income = await Income.findOne({ _id: common.convertToObjectId(incomeId), userId });
    if (!income) throw new CustomError('Income not found');

    const updateData = {
      ...(incomeDetails.month && { month: incomeDetails.month }),
      ...(incomeDetails.year && { year: incomeDetails.year }),
      ...(incomeDetails.type && { type: incomeDetails.type }),
      ...(incomeDetails.sourceName && { sourceName: incomeDetails.sourceName }),
      ...(incomeDetails.amount && { amount: incomeDetails.amount }),
      ...(incomeDetails.receivedDate && { receivedDate: incomeDetails.receivedDate }),
      ...(incomeDetails.notes && { notes: incomeDetails.notes }),
    };
    const updatedIncome = await Income.findOneAndUpdate(
      { _id: common.convertToObjectId(incomeId), userId },
      { $set: updateData },
      { new: true }
    );
    if (!updatedIncome) throw new CustomError('Something went wrong while updating income');
    return updatedIncome;
  };

  listIncomeService = async (userId?: Types.ObjectId) => {
    const income = await Income.find({ userId });
    if (!income) throw new CustomError('No income found');
    return income;
  };

  getIncomeService = async (incomeId: string, userId?: Types.ObjectId) => {
    const income = await Income.findOne({ _id: common.convertToObjectId(incomeId), userId });
    if (!income) throw new CustomError('Income not found');
    return income;
  };

  deleteIncomeService = async (incomeId: string, userId?: Types.ObjectId) => {
    const income = await Income.findOne({ _id: common.convertToObjectId(incomeId), userId });
    if (!income) throw new CustomError('Income not found');
    const deletedIncome = await income.deleteOne();
    if (deletedIncome.deletedCount === 0)
      throw new CustomError('Something went wrong while deleting income');
    return 'Income delete successfully';
  };
}

export { IncomeService };
