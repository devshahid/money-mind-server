import { CustomError } from '../core/ApiError';
import { SavedMember } from '../models/saved-member.model';
import { common } from '../utils/common';
import { Types } from 'mongoose';
import { validateMemberName } from '../utils/validation';

class MembersService {
  private userId: Types.ObjectId;

  constructor(userId: Types.ObjectId) {
    this.userId = userId;
  }

  async createMember(name: string) {
    validateMemberName(name);

    const trimmedName = name.trim();

    // Check uniqueness per user (case-insensitive)
    const existing = await SavedMember.findOne({
      userId: this.userId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      throw new CustomError('A member with this name already exists', 400);
    }

    const member = await SavedMember.create({
      userId: this.userId,
      name: trimmedName,
    });

    return member;
  }

  async listMembers() {
    const members = await SavedMember.find({ userId: this.userId }).sort({ name: 1 }).lean();
    return members;
  }

  async deleteMember(id: string) {
    const member = await SavedMember.findOne({
      _id: common.convertToObjectId(id),
      userId: this.userId,
    });

    if (!member) {
      throw new CustomError('Member not found', 404);
    }

    await member.deleteOne();
    return { message: 'Member deleted successfully' };
  }
}

export { MembersService };
