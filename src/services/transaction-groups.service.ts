import { ClientError, CustomError } from '../core/ApiError';
import { TransactionGroup } from '../models/transaction-group.model';
import { TransactionLogs } from '../models/transaction-logs.model';
import { Types } from 'mongoose';

class TransactionGroupsService {
  private userId: Types.ObjectId;

  constructor(userId: Types.ObjectId) {
    this.userId = userId;
  }

  async createGroup(groupName: string, description?: string) {
    const group = await TransactionGroup.create({
      userId: this.userId,
      groupName,
      description,
      transactionIds: [],
      totalAmount: 0,
    });
    return group;
  }

  async addTransactions(groupId: string, transactionIds: string[]) {
    const group = await TransactionGroup.findOne({
      _id: new Types.ObjectId(groupId),
      userId: this.userId,
    });
    if (!group) throw new CustomError('Transaction group not found', 404);

    const transactions = await TransactionLogs.find({
      _id: { $in: transactionIds.map((id) => new Types.ObjectId(id)) },
      userId: this.userId,
    });

    if (transactions.length !== transactionIds.length) {
      const foundIds = new Set(transactions.map((t) => t._id.toString()));
      const invalidIds = transactionIds.filter((id) => !foundIds.has(id));
      throw new ClientError(`Invalid transaction IDs: ${invalidIds.join(', ')}`);
    }

    const existingIds = new Set(group.transactionIds.map((id) => id.toString()));
    const newIds = transactionIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      group.transactionIds.push(...newIds.map((id) => new Types.ObjectId(id)));
    }

    const allTransactions = await TransactionLogs.find({
      _id: { $in: group.transactionIds },
      userId: this.userId,
    });
    group.totalAmount = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    await group.save();
    return group;
  }

  async removeTransactions(groupId: string, transactionIds: string[]) {
    const group = await TransactionGroup.findOne({
      _id: new Types.ObjectId(groupId),
      userId: this.userId,
    });
    if (!group) throw new CustomError('Transaction group not found', 404);

    const removeSet = new Set(transactionIds);
    group.transactionIds = group.transactionIds.filter((id) => !removeSet.has(id.toString()));

    const remainingTransactions = await TransactionLogs.find({
      _id: { $in: group.transactionIds },
      userId: this.userId,
    });
    group.totalAmount = remainingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    await group.save();
    return group;
  }

  async listGroups() {
    const groups = await TransactionGroup.find({ userId: this.userId }).lean();
    return groups.map((g) => ({
      ...g,
      transactionCount: g.transactionIds?.length || 0,
    }));
  }

  async getGroup(groupId: string) {
    const group = await TransactionGroup.findOne({
      _id: new Types.ObjectId(groupId),
      userId: this.userId,
    }).populate('transactionIds');
    if (!group) throw new CustomError('Transaction group not found', 404);
    return group;
  }

  async updateGroup(groupId: string, data: { groupName?: string; description?: string }) {
    const group = await TransactionGroup.findOneAndUpdate(
      { _id: new Types.ObjectId(groupId), userId: this.userId },
      { $set: data },
      { new: true }
    );
    if (!group) throw new CustomError('Transaction group not found', 404);
    return group;
  }

  async deleteGroup(groupId: string) {
    const group = await TransactionGroup.findOneAndDelete({
      _id: new Types.ObjectId(groupId),
      userId: this.userId,
    });
    if (!group) throw new CustomError('Transaction group not found', 404);
    return 'Transaction group deleted successfully';
  }
}

export { TransactionGroupsService };
