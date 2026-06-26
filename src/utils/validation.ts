import { CustomError } from '../core/ApiError';
import { IMember, SplitType } from '../models/transaction-group.model';
import { SavedMember } from '../models/saved-member.model';
import { Types } from 'mongoose';

const VALID_SPLIT_TYPES: SplitType[] = [
  'EQUAL_INCLUDE_PAYER',
  'EQUAL_EXCLUDE_PAYER',
  'CUSTOM_AMOUNTS',
  'PERCENTAGE_SPLIT',
  'LOAN',
  'ITEMIZED',
];

export function validateGroupName(name: string): void {
  if (!name || name.trim() === '') {
    throw new CustomError('Group name is required', 400);
  }
}

export function validateClientId(clientId: string): void {
  if (!clientId) {
    throw new CustomError('clientId is required', 400);
  }
}

export function validateSplitType(splitType: string): void {
  if (!VALID_SPLIT_TYPES.includes(splitType as SplitType)) {
    throw new CustomError(
      `Invalid splitType. Must be one of: ${VALID_SPLIT_TYPES.join(', ')}`,
      400
    );
  }
}

export function validateMemberFields(members: IMember[]): void {
  for (const member of members) {
    if (!member.name || member.name.trim() === '') {
      throw new CustomError('Each member must have a non-empty name', 400);
    }
    if (member.share !== undefined && member.share < 0) {
      throw new CustomError('Member share must be >= 0', 400);
    }
    if (member.paid !== undefined && member.paid < 0) {
      throw new CustomError('Member paid must be >= 0', 400);
    }
  }
}

export async function validateMemberReferences(
  memberIds: Types.ObjectId[],
  userId: Types.ObjectId
): Promise<void> {
  if (memberIds.length > 0) {
    const validMembers = await SavedMember.find({
      _id: { $in: memberIds },
      userId,
    });
    if (validMembers.length !== memberIds.length) {
      throw new CustomError(
        'One or more member _id values do not reference valid saved members',
        400
      );
    }
  }
}

export function validateMemberName(name: string): void {
  if (!name || name.trim() === '') {
    throw new CustomError('Member name is required', 400);
  }
}
