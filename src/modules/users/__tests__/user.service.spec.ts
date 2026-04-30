/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { UserService } from '../user.service';
import { User } from '../models/user.model';
import { UserLogin } from '../models/user-logins.model';
import { CustomError } from '../../../shared/core/ApiError';
import jwtHandler from '../../../shared/core/jwtHandler';

// Mock dependencies
jest.mock('../models/user.model');
jest.mock('../models/user-logins.model');
jest.mock('../../../shared/core/jwtHandler');

describe('UserService (Unit Tests)', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService();
  });

  describe('registerService', () => {
    it('should throw error when email already exists', async () => {
      const existingUser = {
        _id: new Types.ObjectId(),
        email: 'john@example.com',
        role: 'USER',
        fullName: 'John Doe',
      };

      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        service.registerService('john@example.com', 'password123', 'John Doe', 'USER')
      ).rejects.toThrow('Email address already registered with us');
      await expect(
        service.registerService('john@example.com', 'password123', 'John Doe', 'USER')
      ).rejects.toThrow(CustomError);
    });

    it('should register new user successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const mockUser = {
        _id: new Types.ObjectId(),
        email: 'jane@example.com',
        fullName: 'Jane Smith',
        role: 'USER',
      };

      const mockSave = jest.fn().mockResolvedValue(mockUser);
      (User as any).mockImplementation(() => ({
        ...mockUser,
        save: mockSave,
      }));

      const result = await service.registerService(
        'jane@example.com',
        'password123',
        'Jane Smith',
        'USER'
      );

      expect(result).toBe('User registered successfully');
      expect(mockSave).toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledWith({ email: 'jane@example.com', role: 'USER' });
    });

    it('should register admin user successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const mockAdmin = {
        _id: new Types.ObjectId(),
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'ADMIN',
      };

      const mockSave = jest.fn().mockResolvedValue(mockAdmin);
      (User as any).mockImplementation(() => ({
        ...mockAdmin,
        save: mockSave,
      }));

      const result = await service.registerService(
        'admin@example.com',
        'adminpass',
        'Admin User',
        'ADMIN'
      );

      expect(result).toBe('User registered successfully');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@example.com', role: 'ADMIN' });
    });

    it('should throw error when save fails', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(null);
      (User as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(
        service.registerService('test@example.com', 'password', 'Test User', 'USER')
      ).rejects.toThrow('Something went wrong while creating user');
      await expect(
        service.registerService('test@example.com', 'password', 'Test User', 'USER')
      ).rejects.toThrow(CustomError);
    });
  });

  describe('loginService', () => {
    it('should throw error when user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.loginService('notfound@example.com', 'password', 'USER')
      ).rejects.toThrow('Email address is not registered with us');
      await expect(
        service.loginService('notfound@example.com', 'password', 'USER')
      ).rejects.toThrow(CustomError);
    });

    it('should throw error when password does not match', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        email: 'john@example.com',
        role: 'USER',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.loginService('john@example.com', 'wrongpassword', 'USER')
      ).rejects.toThrow('Invalid Email or Password');
      await expect(
        service.loginService('john@example.com', 'wrongpassword', 'USER')
      ).rejects.toThrow(CustomError);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
    });

    it('should login user successfully', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        email: 'john@example.com',
        fullName: 'John Doe',
        role: 'USER',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockToken = 'jwt-token-123';

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (jwtHandler.createJwtToken as jest.Mock).mockReturnValue(mockToken);

      const mockLoginSave = jest.fn().mockResolvedValue({});
      (UserLogin as any).mockImplementation(() => ({
        save: mockLoginSave,
      }));

      (User.findById as jest.Mock).mockResolvedValue({
        _id: userId,
        email: 'john@example.com',
        fullName: 'John Doe',
        role: 'USER',
      });

      const result = await service.loginService('john@example.com', 'password123', 'USER');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockToken);
      expect(result.email).toBe('john@example.com');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwtHandler.createJwtToken).toHaveBeenCalledWith({
        email: 'john@example.com',
        userId: userId,
        userType: 'USER',
      });
      expect(mockLoginSave).toHaveBeenCalled();
    });

    it('should delete previous access token if provided', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        email: 'john@example.com',
        role: 'USER',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const oldToken = 'old-jwt-token';
      const newToken = 'new-jwt-token';

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (jwtHandler.createJwtToken as jest.Mock).mockReturnValue(newToken);
      (UserLogin.findOneAndDelete as jest.Mock).mockResolvedValue({});

      const mockLoginSave = jest.fn().mockResolvedValue({});
      (UserLogin as any).mockImplementation(() => ({
        save: mockLoginSave,
      }));

      (User.findById as jest.Mock).mockResolvedValue({
        _id: userId,
        email: 'john@example.com',
        role: 'USER',
      });

      await service.loginService('john@example.com', 'password123', 'USER', oldToken);

      expect(UserLogin.findOneAndDelete).toHaveBeenCalledWith({ accessToken: oldToken });
    });

    it('should throw error when user not found after login', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        email: 'john@example.com',
        role: 'USER',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockToken = 'jwt-token';

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (jwtHandler.createJwtToken as jest.Mock).mockReturnValue(mockToken);

      const mockLoginSave = jest.fn().mockResolvedValue({});
      (UserLogin as any).mockImplementation(() => ({
        save: mockLoginSave,
      }));

      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.loginService('john@example.com', 'password123', 'USER')).rejects.toThrow(
        'User not exist'
      );
      await expect(service.loginService('john@example.com', 'password123', 'USER')).rejects.toThrow(
        CustomError
      );
    });

    it('should handle admin login separately', async () => {
      const userId = new Types.ObjectId();
      const mockAdmin = {
        _id: userId,
        email: 'admin@example.com',
        role: 'ADMIN',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockToken = 'admin-jwt-token';

      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (jwtHandler.createJwtToken as jest.Mock).mockReturnValue(mockToken);

      const mockLoginSave = jest.fn().mockResolvedValue({});
      (UserLogin as any).mockImplementation(() => ({
        save: mockLoginSave,
      }));

      (User.findById as jest.Mock).mockResolvedValue({
        _id: userId,
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const result = await service.loginService('admin@example.com', 'adminpass', 'ADMIN');

      expect(result).toBeDefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@example.com', role: 'ADMIN' });
      expect(jwtHandler.createJwtToken).toHaveBeenCalledWith({
        email: 'admin@example.com',
        userId: userId,
        userType: 'ADMIN',
      });
    });
  });

  describe('logoutService', () => {
    it('should throw error when user not logged in', async () => {
      (UserLogin.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.logoutService('invalid-token')).rejects.toThrow(
        'User not logged in found'
      );
      await expect(service.logoutService('invalid-token')).rejects.toThrow(CustomError);
    });

    it('should logout user successfully', async () => {
      const mockLogin = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        email: 'john@example.com',
        accessToken: 'valid-token',
      };

      (UserLogin.findOne as jest.Mock).mockResolvedValue(mockLogin);
      (UserLogin.findOneAndDelete as jest.Mock).mockResolvedValue(mockLogin);

      const result = await service.logoutService('valid-token');

      expect(result).toEqual(mockLogin);
      expect(UserLogin.findOne).toHaveBeenCalledWith({ accessToken: 'valid-token' });
      expect(UserLogin.findOneAndDelete).toHaveBeenCalledWith(
        { _id: mockLogin._id },
        { new: true, lean: true }
      );
    });

    it('should throw error when logout fails', async () => {
      const mockLogin = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        email: 'john@example.com',
        accessToken: 'valid-token',
      };

      (UserLogin.findOne as jest.Mock).mockResolvedValue(mockLogin);
      (UserLogin.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(service.logoutService('valid-token')).rejects.toThrow(
        'Something went wrong while logging not user'
      );
      await expect(service.logoutService('valid-token')).rejects.toThrow(CustomError);
    });
  });
});
