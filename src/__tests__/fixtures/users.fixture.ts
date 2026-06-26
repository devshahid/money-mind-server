/**
 * Test Fixtures - Users
 * Sample user data for testing
 */

import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

const hashedPassword = bcrypt.hashSync('Test@1234', 10);

export const testUsers = [
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'test@example.com',
    password: hashedPassword,
    name: 'Test User',
    role: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'admin@example.com',
    password: hashedPassword,
    name: 'Admin User',
    role: 'ADMIN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    email: 'john@example.com',
    password: hashedPassword,
    name: 'John Doe',
    role: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const getTestUser = (index: number = 0) => testUsers[index];
