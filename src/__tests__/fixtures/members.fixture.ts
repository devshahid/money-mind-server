/**
 * Test Fixtures - Members
 * Sample saved members data for testing
 */

import { Types } from 'mongoose';

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');

export const testMembers = [
  {
    _id: new Types.ObjectId('620000000000000000000001'),
    userId,
    name: 'Alice',
    email: 'alice@example.com',
    phone: '+1234567890',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: new Types.ObjectId('620000000000000000000002'),
    userId,
    name: 'Bob',
    email: 'bob@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: new Types.ObjectId('620000000000000000000003'),
    userId,
    name: 'Charlie',
    phone: '+9876543210',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const getTestMember = (index: number = 0) => testMembers[index];
