import { CustomError } from '../core/ApiError';
import { TransactionGroup, SplitType, IMember } from '../models/transaction-group.model';
import mongoose, { Types } from 'mongoose';
import {
  validateGroupName,
  validateClientId,
  validateSplitType,
  validateMemberFields,
  validateMemberReferences,
} from '../utils/validation';

interface CreateGroupInput {
  clientId: string;
  name: string;
  involvedParty?: string;
  members?: IMember[];
  notes?: string;
  transactionIds?: string[];
  splitType?: SplitType;
  splitConfig?: Record<string, unknown> | null;
}

interface UpdateGroupInput {
  name?: string;
  involvedParty?: string;
  members?: IMember[];
  notes?: string;
  transactionIds?: string[];
  splitType?: SplitType;
  splitConfig?: Record<string, unknown> | null;
}

interface SyncGroupInput {
  clientId: string;
  name?: string;
  involvedParty?: string;
  members?: IMember[];
  notes?: string;
  transactionIds?: string[];
  splitType?: SplitType;
  splitConfig?: Record<string, unknown> | null;
  updatedAt?: string;
}

class TransactionGroupsService {
  private userId: Types.ObjectId;

  constructor(userId: Types.ObjectId) {
    this.userId = userId;
  }

  private async validateMembers(members: IMember[]) {
    validateMemberFields(members);

    const memberIds = members
      .filter((m) => m._id)
      .map((m) => (typeof m._id === 'string' ? new mongoose.Types.ObjectId(m._id) : m._id!));

    await validateMemberReferences(memberIds, this.userId);
  }

  private buildQuery(id: string) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return { _id: new mongoose.Types.ObjectId(id), userId: this.userId };
    }
    return { clientId: id, userId: this.userId };
  }

  async createGroup(data: CreateGroupInput) {
    validateGroupName(data.name);
    validateClientId(data.clientId);

    if (data.members && data.members.length > 0) {
      await this.validateMembers(data.members);
    }

    if (data.splitType) {
      validateSplitType(data.splitType);
    }

    const group = await TransactionGroup.create({
      userId: this.userId,
      clientId: data.clientId,
      name: data.name,
      involvedParty: data.involvedParty || '',
      members: data.members || [],
      notes: data.notes || '',
      transactionIds: data.transactionIds || [],
      splitType: data.splitType || 'EQUAL_INCLUDE_PAYER',
      splitConfig: data.splitConfig ?? null,
    });

    return group;
  }

  async listGroups() {
    const groups = await TransactionGroup.find({ userId: this.userId })
      .sort({ updatedAt: -1 })
      .lean();
    return groups;
  }

  async getGroup(id: string) {
    const query = this.buildQuery(id);
    const group = await TransactionGroup.findOne(query);
    if (!group) throw new CustomError('Group not found', 404);
    return group;
  }

  async updateGroup(id: string, data: UpdateGroupInput) {
    const query = this.buildQuery(id);
    const group = await TransactionGroup.findOne(query);
    if (!group) throw new CustomError('Group not found', 404);

    if (data.name !== undefined) {
      validateGroupName(data.name);
      group.name = data.name;
    }

    if (data.involvedParty !== undefined) {
      group.involvedParty = data.involvedParty;
    }

    if (data.members !== undefined) {
      if (data.members.length > 0) {
        await this.validateMembers(data.members);
      }
      group.members = data.members;
    }

    if (data.notes !== undefined) {
      group.notes = data.notes;
    }

    if (data.transactionIds !== undefined) {
      group.transactionIds = data.transactionIds;
    }

    if (data.splitType !== undefined) {
      validateSplitType(data.splitType);
      group.splitType = data.splitType;
    }

    if (data.splitConfig !== undefined) {
      group.splitConfig = data.splitConfig;
    }

    await group.save();
    return group;
  }

  async deleteGroup(id: string) {
    const query = this.buildQuery(id);
    const group = await TransactionGroup.findOneAndDelete(query);
    if (!group) throw new CustomError('Group not found', 404);
    return { message: 'Group deleted successfully' };
  }

  async addTransactions(id: string, transactionIds: string[]) {
    const query = this.buildQuery(id);
    const group = await TransactionGroup.findOne(query);
    if (!group) throw new CustomError('Group not found', 404);

    const existingIds = new Set(group.transactionIds.map((tid) => tid.toString()));
    const newIds = transactionIds.filter((tid) => !existingIds.has(tid));

    if (newIds.length > 0) {
      group.transactionIds.push(...newIds);
    }

    await group.save();
    return group;
  }

  async removeTransaction(id: string, transactionId: string) {
    const query = this.buildQuery(id);
    const group = await TransactionGroup.findOne(query);
    if (!group) throw new CustomError('Group not found', 404);

    group.transactionIds = group.transactionIds.filter((tid) => tid.toString() !== transactionId);

    await group.save();
    return group;
  }

  async syncGroups(groups: SyncGroupInput[], deletedClientIds: string[] = []) {
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Delete groups that were removed locally
    if (deletedClientIds.length > 0) {
      for (const clientId of deletedClientIds) {
        const result = await TransactionGroup.findOneAndDelete({
          userId: this.userId,
          clientId,
        });
        if (result) deleted++;
      }
    }

    for (const incoming of groups) {
      if (!incoming.clientId) continue;

      const existing = await TransactionGroup.findOne({
        userId: this.userId,
        clientId: incoming.clientId,
      });

      if (existing) {
        // Last-write-wins: only update if incoming updatedAt is newer
        const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        const serverUpdatedAt = (existing as unknown as { updatedAt?: Date }).updatedAt;
        const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;

        if (incomingTime > serverTime) {
          if (incoming.name !== undefined) existing.name = incoming.name;
          if (incoming.involvedParty !== undefined) existing.involvedParty = incoming.involvedParty;
          if (incoming.members !== undefined) existing.members = incoming.members;
          if (incoming.notes !== undefined) existing.notes = incoming.notes;
          if (incoming.transactionIds !== undefined)
            existing.transactionIds = incoming.transactionIds;
          if (incoming.splitType !== undefined) existing.splitType = incoming.splitType;
          if (incoming.splitConfig !== undefined) existing.splitConfig = incoming.splitConfig;
          await existing.save();
          updated++;
        }
      } else {
        await TransactionGroup.create({
          userId: this.userId,
          clientId: incoming.clientId,
          name: incoming.name || '',
          involvedParty: incoming.involvedParty || '',
          members: incoming.members || [],
          notes: incoming.notes || '',
          transactionIds: incoming.transactionIds || [],
          splitType: incoming.splitType || 'EQUAL_INCLUDE_PAYER',
          splitConfig: incoming.splitConfig ?? null,
        });
        created++;
      }
    }

    const allGroups = await TransactionGroup.find({ userId: this.userId })
      .sort({ updatedAt: -1 })
      .lean();

    return {
      synced: created + updated + deleted,
      created,
      updated,
      deleted,
      groups: allGroups,
    };
  }
}

export { TransactionGroupsService };
