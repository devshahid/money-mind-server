import dayjs from 'dayjs';
import { CustomError } from '../core/ApiError';
import { Category } from '../models/category.model';
import { Labels } from '../models/labels.model';
import {
  ITransactionLogs,
  ITransactionPayload,
  TransactionLogs,
} from '../models/transaction-logs.model';
import { common } from '../utils/common';
import { pagination } from '../utils/pagination';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
class TransactionLogsService {
  private userId: Types.ObjectId;
  constructor(userId: Types.ObjectId) {
    this.userId = userId;
  }

  private createHashMap = (log: ITransactionPayload) => {
    // remove all special characters and make it lowercase
    const date = log.date
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    const narration = log.narration
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    const withdrawlAmount = log.withdrawlAmount
      ?.toString()
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    const depositAmount = log.depositAmount
      ?.toString()
      .trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    const refNumber = log.refNumber
      ?.trim()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    return `${date}-${narration}-${refNumber}-${depositAmount}-${withdrawlAmount}`;
  };

  private upsertLabels = async (transactions: ITransactionLogs[], userId: Types.ObjectId) => {
    const labelSet = new Set<string>();

    // 1. Collect all unique labels from transactions
    for (const tx of transactions) {
      if (Array.isArray(tx.label)) {
        for (const label of tx.label) {
          labelSet.add(label.toLowerCase());
        }
      }
    }

    const uniqueLabels = Array.from(labelSet);
    if (!uniqueLabels.length) return;

    // 2. Fetch existing labels from DB
    const existingLabels = await Labels.find({
      createdBy: userId,
      labelName: { $in: uniqueLabels },
    }).lean();

    const existingLabelNames = new Set(
      existingLabels.map((label) => label.labelName.toLowerCase())
    );

    // 3. Find new labels not in DB
    const newLabels = uniqueLabels.filter((label) => !existingLabelNames.has(label));

    if (newLabels.length > 0) {
      const operations = newLabels.map((labelName) => ({
        updateOne: {
          filter: { labelName, createdBy: userId },
          update: {
            $setOnInsert: {
              labelName,
              createdBy: userId,
            },
          },
          upsert: true,
        },
      }));

      await Labels.bulkWrite(operations);
    }
  };

  async uploadLogsFromFile(logs: ITransactionPayload[], bankName: string) {
    const hashMappedLogs = logs.map((log) => ({
      ...log,
      hashMap: this.createHashMap(log),
    }));

    const incomingHashes = hashMappedLogs.map((log) => log.hashMap);

    const duplicates = await TransactionLogs.find({
      userId: this.userId,
      hashMap: { $in: incomingHashes },
    }).select('hashMap');

    const existingHashSet = new Set(duplicates.map((dup) => dup.hashMap));

    const uniqueLogs = hashMappedLogs.filter((log) => !existingHashSet.has(log.hashMap));

    if (uniqueLogs.length > 0) {
      const uniqueKey = uuidv4();
      const response = await TransactionLogs.insertMany(
        uniqueLogs.map((log) => ({
          userId: this.userId,
          transactionDate: common.parseFlexibleDate(log.date),
          narration: log.narration,
          amount:
            log.withdrawlAmount?.toString().length > 0 ? log.withdrawlAmount : log.depositAmount,
          uploadKey: uniqueKey,
          isCredit: log.withdrawlAmount?.toString().length > 0 ? false : true,
          isCash: log.isCash ?? false,
          bankName: bankName,
          hashMap: log.hashMap,
        }))
      );
      console.log(response);
    }

    return {
      inserted: uniqueLogs.length,
      skipped: logs.length - uniqueLogs.length,
    };
  }

  async fetchTransactionLogs(
    page: number,
    limit: number,
    amount?: string,
    dateFrom?: string,
    dateTo?: string,
    bankName?: string,
    transactionType?: string,
    type?: string,
    labels?: string,
    category?: string,
    keyword?: string,
    uploadKey?: string
  ) {
    const query: PipelineStage[] = [];
    const matchQuery: FilterQuery<ITransactionLogs> = { userId: this.userId, status: 'PENDING' };
    if (uploadKey) matchQuery.uploadKey = uploadKey;
    if (amount) matchQuery.amount = Number(amount);
    if (bankName) matchQuery.bankName = { $regex: bankName, $options: 'i' };

    if (transactionType && transactionType === 'online') matchQuery.isCash = false;
    if (transactionType && transactionType === 'cash') matchQuery.isCash = true;

    if (type && type === 'debit') matchQuery.isCredit = false;
    if (type && type === 'credit') matchQuery.isCredit = true;

    if (labels && labels.length > 0) matchQuery.label = { $in: labels };
    if (category && category.length > 0) matchQuery.category = { $in: category };

    if (dateFrom || dateTo) {
      matchQuery.transactionDate = {};
      if (dateFrom) matchQuery.transactionDate.$gte = new Date(dateFrom);

      if (dateTo) matchQuery.transactionDate.$lte = new Date(dateTo);
    }

    if (keyword && keyword.length > 0) {
      matchQuery.$or = [
        { narration: { $regex: keyword, $options: 'i' } },
        { notes: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
        { bankName: { $regex: keyword, $options: 'i' } },
        { amount: keyword },
      ];
    }
    query.push({ $match: matchQuery });
    query.push({ $sort: { transactionDate: -1 } });

    const results = await pagination.add(TransactionLogs, query, page, limit);
    return results;
  }

  async getUploadKey() {
    // group the logs by uploadKey in which status is Pending and return the upload keys along with their corresponding log counts
    const uploadKeyCounts = await TransactionLogs.aggregate([
      { $match: { userId: this.userId, status: 'PENDING' } },
      { $group: { _id: '$uploadKey', count: { $sum: 1 } } },
      { $project: { uploadKey: '$_id', count: 1 } },
    ]);
    return uploadKeyCounts;
  }

  async updateBulkLogs(transactions: ITransactionLogs[], uploadKey: string, bankName?: string) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new CustomError('No transactions provided for update.');
    }

    const bulkOps = transactions.map((tx: ITransactionLogs) => ({
      updateOne: {
        filter: { _id: common.convertToObjectId(tx._id), uploadKey, userId: this.userId },
        update: {
          $set: {
            ...(tx.notes !== undefined && { notes: tx.notes }),
            ...(tx.label !== undefined && { label: tx.label }),
            ...(tx.category !== undefined && { category: tx.category }),
            updatedAt: new Date(),
          },
        },
      },
    }));
    await TransactionLogs.bulkWrite(bulkOps);

    if (bankName && bankName.length > 0) {
      await TransactionLogs.updateMany({ uploadKey, userId: this.userId }, { $set: { bankName } });
    }
    return 'Transactions updated successfully.';
  }

  async updateSingleLog(id: string, transaction: ITransactionLogs) {
    const transactionLog = await TransactionLogs.findOne({
      _id: common.convertToObjectId(id),
      userId: this.userId,
    });
    if (!transactionLog) {
      throw new CustomError('Transaction log not found.', 404);
    }

    if (transactionLog.label && transactionLog.label.length > 0) {
      // Insert unique labels into the Labels collection use addtoSet
      await this.upsertLabels([transactionLog], this.userId);
    }

    if (transactionLog.category && transactionLog.category.length > 0) {
      // Insert unique categories into the Category collection
      const categories = await Category.find({
        categoryName: { $in: transactionLog.category.toLocaleLowerCase() },
      });
      if (categories.length === 0) {
        await Category.create({
          categoryName: transactionLog.category.toLocaleLowerCase(),
          createdBy: this.userId,
        });
      }
    }

    const updatedTransaction = await TransactionLogs.findOneAndUpdate(
      { _id: common.convertToObjectId(id), userId: this.userId },
      {
        $set: {
          ...(transaction.notes !== undefined && { notes: transaction.notes }),
          ...(transaction.category !== undefined && { category: transaction.category }),
          ...(transaction.label !== undefined && { label: transaction.label }),
          ...(transaction.isCredit === false && { isCredit: false }),
          ...(transaction.isCredit === true && { isCredit: true }),
        },
      },
      { new: true }
    );
    if (!updatedTransaction) {
      throw new CustomError('Failed to update transaction log.');
    }
    return updatedTransaction;
  }

  async syncTransactionsWithDB(transactions: ITransactionLogs[], page: number, limit: number) {
    if (!transactions.length) throw new CustomError('No transactions found');
    await this.upsertLabels(transactions, this.userId);

    // 2. Prepare transaction upserts
    const txOperations = transactions.map((tx) => ({
      updateOne: {
        filter: { _id: tx._id, userId: this.userId },
        update: {
          $set: {
            ...tx,
            userId: this.userId,
          },
        },
        upsert: true,
      },
    }));

    const updatedTransactions = await TransactionLogs.bulkWrite(txOperations);
    if (!updatedTransactions)
      throw new CustomError('Something went wrong while syncing transactions');
    else return await this.fetchTransactionLogs(page, limit);
  }

  async listLabelsService() {
    const labels = await Labels.find({ createdBy: this.userId });
    return labels;
  }

  async listCategoriesService() {
    const categories = await Category.find({ createdBy: this.userId });
    return categories;
  }

  async deleteAllTransactionsService() {
    // await Category.deleteMany({ createdBy: this.userId });
    // await Labels.deleteMany({ createdBy: this.userId });
    // await TransactionLogs.deleteMany({ userId: this.userId });
    return 'Logs deleted successfully';
  }

  async addCashMemoService(transaction: ITransactionLogs) {
    const newTransaction = new TransactionLogs({
      ...transaction,
      transactionDate: dayjs(transaction.transactionDate, 'DD/MM/YYYY').toDate(),
      userId: this.userId,
    });

    const loggedTransaction = await newTransaction.save();
    if (!loggedTransaction)
      throw new CustomError('Something went wrong while adding the transaction');
    return loggedTransaction;
  }
}

export { TransactionLogsService };
