import { CustomError } from '../core/ApiError';
import {
  validateGroupName,
  validateClientId,
  validateSplitType,
  validateMemberFields,
  validateMemberName,
} from '../utils/validation';
import { IMember } from '../models/transaction-group.model';
import { Types } from 'mongoose';

describe('Validation helpers', () => {
  describe('validateGroupName', () => {
    it('should throw 400 on empty name', () => {
      expect(() => validateGroupName('')).toThrow(CustomError);
      expect(() => validateGroupName('')).toThrow('Group name is required');
    });

    it('should throw 400 on whitespace-only name', () => {
      expect(() => validateGroupName('   ')).toThrow(CustomError);
      expect(() => validateGroupName('   ')).toThrow('Group name is required');
    });

    it('should not throw on valid name', () => {
      expect(() => validateGroupName('Trip')).not.toThrow();
    });
  });

  describe('validateClientId', () => {
    it('should throw 400 on missing clientId', () => {
      expect(() => validateClientId('')).toThrow(CustomError);
      expect(() => validateClientId('')).toThrow('clientId is required');
    });

    it('should not throw on valid clientId', () => {
      expect(() => validateClientId('abc-123')).not.toThrow();
    });
  });

  describe('validateSplitType', () => {
    it('should throw 400 on invalid split type', () => {
      expect(() => validateSplitType('INVALID')).toThrow(CustomError);
      expect(() => validateSplitType('INVALID')).toThrow('Invalid splitType');
    });

    it('should accept EQUAL_INCLUDE_PAYER', () => {
      expect(() => validateSplitType('EQUAL_INCLUDE_PAYER')).not.toThrow();
    });

    it('should accept EQUAL_EXCLUDE_PAYER', () => {
      expect(() => validateSplitType('EQUAL_EXCLUDE_PAYER')).not.toThrow();
    });

    it('should accept CUSTOM_AMOUNTS', () => {
      expect(() => validateSplitType('CUSTOM_AMOUNTS')).not.toThrow();
    });

    it('should accept PERCENTAGE_SPLIT', () => {
      expect(() => validateSplitType('PERCENTAGE_SPLIT')).not.toThrow();
    });

    it('should accept LOAN', () => {
      expect(() => validateSplitType('LOAN')).not.toThrow();
    });

    it('should accept ITEMIZED', () => {
      expect(() => validateSplitType('ITEMIZED')).not.toThrow();
    });
  });

  describe('validateMemberFields', () => {
    it('should throw 400 on empty member name', () => {
      const members = [
        { _id: new Types.ObjectId(), name: '', share: 100, paid: 0, percentage: 0 },
      ] as IMember[];

      expect(() => validateMemberFields(members)).toThrow(CustomError);
      expect(() => validateMemberFields(members)).toThrow('Each member must have a non-empty name');
    });

    it('should throw 400 on negative share', () => {
      const members = [
        { _id: new Types.ObjectId(), name: 'Alice', share: -10, paid: 0, percentage: 0 },
      ] as IMember[];

      expect(() => validateMemberFields(members)).toThrow(CustomError);
      expect(() => validateMemberFields(members)).toThrow('Member share must be >= 0');
    });

    it('should throw 400 on negative paid', () => {
      const members = [
        { _id: new Types.ObjectId(), name: 'Alice', share: 0, paid: -5, percentage: 0 },
      ] as IMember[];

      expect(() => validateMemberFields(members)).toThrow(CustomError);
      expect(() => validateMemberFields(members)).toThrow('Member paid must be >= 0');
    });

    it('should not throw on valid members', () => {
      const members = [
        { _id: new Types.ObjectId(), name: 'Alice', share: 100, paid: 50, percentage: 0 },
        { _id: new Types.ObjectId(), name: 'Bob', share: 100, paid: 50, percentage: 0 },
      ] as IMember[];

      expect(() => validateMemberFields(members)).not.toThrow();
    });
  });

  describe('validateMemberName', () => {
    it('should throw 400 on empty name', () => {
      expect(() => validateMemberName('')).toThrow(CustomError);
      expect(() => validateMemberName('')).toThrow('Member name is required');
    });

    it('should throw 400 on whitespace-only name', () => {
      expect(() => validateMemberName('   ')).toThrow(CustomError);
      expect(() => validateMemberName('   ')).toThrow('Member name is required');
    });

    it('should not throw on valid name', () => {
      expect(() => validateMemberName('Alice')).not.toThrow();
    });
  });
});
