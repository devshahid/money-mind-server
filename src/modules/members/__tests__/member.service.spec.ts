/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

import { Types } from 'mongoose';
import { MembersService } from '../member.service';
import { SavedMember } from '../models/saved-member.model';
import { CustomError } from '../../../shared/core/ApiError';

// Mock dependencies
jest.mock('../models/saved-member.model');
jest.mock('../../../utils/common');
jest.mock('../../../utils/validation');

describe('MembersService (Unit Tests)', () => {
  let service: MembersService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MembersService(mockUserId);
  });

  describe('createMember', () => {
    it('should create a new member successfully', async () => {
      const mockValidation = require('../../../utils/validation');
      mockValidation.validateMemberName = jest.fn();

      (SavedMember.findOne as jest.Mock).mockResolvedValue(null);

      const mockMember = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        name: 'John Doe',
      };

      (SavedMember.create as jest.Mock).mockResolvedValue(mockMember);

      const result = await service.createMember('John Doe');

      expect(result).toEqual(mockMember);
      expect(mockValidation.validateMemberName).toHaveBeenCalledWith('John Doe');
      expect(SavedMember.findOne).toHaveBeenCalled();
      expect(SavedMember.create).toHaveBeenCalledWith({
        userId: mockUserId,
        name: 'John Doe',
      });
    });

    it('should trim whitespace from member name', async () => {
      const mockValidation = require('../../../utils/validation');
      mockValidation.validateMemberName = jest.fn();

      (SavedMember.findOne as jest.Mock).mockResolvedValue(null);

      const mockMember = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        name: 'Jane Smith',
      };

      (SavedMember.create as jest.Mock).mockResolvedValue(mockMember);

      const result = await service.createMember('  Jane Smith  ');

      expect(result).toEqual(mockMember);
      expect(SavedMember.create).toHaveBeenCalledWith({
        userId: mockUserId,
        name: 'Jane Smith',
      });
    });

    it('should throw error when member with same name already exists', async () => {
      const mockValidation = require('../../../utils/validation');
      mockValidation.validateMemberName = jest.fn();

      const existingMember = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        name: 'Alice Brown',
      };

      (SavedMember.findOne as jest.Mock).mockResolvedValue(existingMember);

      await expect(service.createMember('Alice Brown')).rejects.toThrow(
        'A member with this name already exists'
      );
      await expect(service.createMember('Alice Brown')).rejects.toThrow(CustomError);
      expect(SavedMember.create).not.toHaveBeenCalled();
    });

    it('should perform case-insensitive duplicate check', async () => {
      const mockValidation = require('../../../utils/validation');
      mockValidation.validateMemberName = jest.fn();

      const existingMember = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        name: 'bob wilson',
      };

      (SavedMember.findOne as jest.Mock).mockResolvedValue(existingMember);

      await expect(service.createMember('BOB WILSON')).rejects.toThrow(
        'A member with this name already exists'
      );
      expect(SavedMember.create).not.toHaveBeenCalled();
    });

    it('should call validateMemberName for validation', async () => {
      const mockValidation = require('../../../utils/validation');
      mockValidation.validateMemberName = jest.fn(() => {
        throw new CustomError('Invalid name', 400);
      });

      await expect(service.createMember('')).rejects.toThrow('Invalid name');
      expect(SavedMember.findOne).not.toHaveBeenCalled();
      expect(SavedMember.create).not.toHaveBeenCalled();
    });
  });

  describe('listMembers', () => {
    it('should return all members for user sorted by name', async () => {
      const mockMembers = [
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          name: 'Alice',
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          name: 'Bob',
        },
        {
          _id: new Types.ObjectId(),
          userId: mockUserId,
          name: 'Charlie',
        },
      ];

      (SavedMember.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMembers),
        }),
      });

      const result = await service.listMembers();

      expect(result).toEqual(mockMembers);
      expect(SavedMember.find).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should return empty array when user has no members', async () => {
      (SavedMember.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.listMembers();

      expect(result).toEqual([]);
      expect(SavedMember.find).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('deleteMember', () => {
    it('should throw error when member not found', async () => {
      (SavedMember.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteMember('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Member not found'
      );
      await expect(service.deleteMember('507f1f77bcf86cd799439011')).rejects.toThrow(CustomError);
    });

    it('should delete member successfully', async () => {
      const memberId = new Types.ObjectId();
      const mockMember = {
        _id: memberId,
        userId: mockUserId,
        name: 'David Lee',
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };

      (SavedMember.findOne as jest.Mock).mockResolvedValue(mockMember);

      const result = await service.deleteMember(memberId.toString());

      expect(result).toEqual({ message: 'Member deleted successfully' });
      expect(mockMember.deleteOne).toHaveBeenCalled();
      expect(SavedMember.findOne).toHaveBeenCalledWith({
        _id: undefined,
        userId: mockUserId,
      });
    });

    it('should verify ownership before deletion', async () => {
      const memberId = new Types.ObjectId();

      (SavedMember.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteMember(memberId.toString())).rejects.toThrow('Member not found');

      expect(SavedMember.findOne).toHaveBeenCalledWith({
        _id: undefined,
        userId: mockUserId,
      });
    });
  });
});
