/// <reference types="jest" />

import request from 'supertest';
import { Express } from 'express';
import { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../__tests__/helpers/database.helper';
import { User } from '../../users/models/user.model';
import { UserLogin } from '../../users/models/user-logins.model';
import { SavedMember } from '../models/saved-member.model';
import jwtHandler from '../../../shared/core/jwtHandler';

interface MemberResponse {
  _id: string;
  name: string;
  userId: string;
}

describe('Members API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: Types.ObjectId;

  beforeAll(async () => {
    await connectTestDatabase();
    const appModule = await import('../../../app');
    app = appModule.default;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test user
    const testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'USER',
    });
    testUserId = testUser._id;

    // Generate auth token
    authToken = jwtHandler.createJwtToken({
      email: testUser.email,
      userId: testUser._id,
      userType: 'USER',
    });

    // Create UserLogin entry for auth validation
    await UserLogin.create({
      userId: testUser._id,
      email: testUser.email,
      accessToken: authToken,
    });
  });

  describe('POST /api/v1/members', () => {
    it('should create a new member successfully', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({ name: 'John Doe' })
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output).toBeDefined();
      expect(response.body.output.name).toBe('John Doe');
      expect(response.body.output.userId).toBe(testUserId.toString());

      // Verify in database
      const member = await SavedMember.findById(response.body.output._id);
      expect(member).toBeDefined();
      expect(member?.name).toBe('John Doe');
    });

    it('should trim whitespace from member name', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({ name: '  Jane Smith  ' })
        .expect(200);

      expect(response.body.output.name).toBe('Jane Smith');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({})
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('name');
    });

    it('should return 400 when name is too short', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({ name: 'A' })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 400 when member name already exists', async () => {
      // Create first member
      await SavedMember.create({
        userId: testUserId,
        name: 'Duplicate Name',
      });

      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({ name: 'Duplicate Name' })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).post('/api/v1/members').send({ name: 'John Doe' }).expect(401);
    });

    it('should perform case-insensitive duplicate check', async () => {
      await SavedMember.create({
        userId: testUserId,
        name: 'alice brown',
      });

      const response = await request(app)
        .post('/api/v1/members')
        .set('accessToken', authToken)
        .send({ name: 'ALICE BROWN' })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/members', () => {
    it('should return empty array when no members exist', async () => {
      const response = await request(app)
        .get('/api/v1/members')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output).toEqual([]);
    });

    it('should return all members for authenticated user', async () => {
      // Create test members
      await SavedMember.create([
        { userId: testUserId, name: 'Alice' },
        { userId: testUserId, name: 'Bob' },
        { userId: testUserId, name: 'Charlie' },
      ]);

      const response = await request(app)
        .get('/api/v1/members')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output).toHaveLength(3);
      expect(response.body.output.map((m: MemberResponse) => m.name)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
    });

    it('should return only authenticated user members', async () => {
      const otherUserId = new Types.ObjectId();

      await SavedMember.create([
        { userId: testUserId, name: 'My Member' },
        { userId: otherUserId, name: 'Other User Member' },
      ]);

      const response = await request(app)
        .get('/api/v1/members')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.output).toHaveLength(1);
      expect(response.body.output[0].name).toBe('My Member');
    });

    it('should return members sorted by name', async () => {
      await SavedMember.create([
        { userId: testUserId, name: 'Zoe' },
        { userId: testUserId, name: 'Alice' },
        { userId: testUserId, name: 'Michael' },
      ]);

      const response = await request(app)
        .get('/api/v1/members')
        .set('accessToken', authToken)
        .expect(200);

      const names = response.body.output.map((m: MemberResponse) => m.name);
      expect(names).toEqual(['Alice', 'Michael', 'Zoe']);
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app).get('/api/v1/members').expect(401);
    });
  });

  describe('DELETE /api/v1/members/:id', () => {
    it('should delete member successfully', async () => {
      const member = await SavedMember.create({
        userId: testUserId,
        name: 'To Delete',
      });

      const response = await request(app)
        .delete(`/api/v1/members/${member._id}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output.message).toContain('deleted successfully');

      // Verify deleted from database
      const deletedMember = await SavedMember.findById(member._id);
      expect(deletedMember).toBeNull();
    });

    it('should return 404 when member not found', async () => {
      const nonExistentId = new Types.ObjectId();

      const response = await request(app)
        .delete(`/api/v1/members/${nonExistentId}`)
        .set('accessToken', authToken)
        .expect(404);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 when trying to delete another user member', async () => {
      const otherUserId = new Types.ObjectId();
      const otherMember = await SavedMember.create({
        userId: otherUserId,
        name: 'Other User Member',
      });

      const response = await request(app)
        .delete(`/api/v1/members/${otherMember._id}`)
        .set('accessToken', authToken)
        .expect(404);

      expect(response.body.message).toContain('not found');

      // Verify not deleted
      const stillExists = await SavedMember.findById(otherMember._id);
      expect(stillExists).toBeDefined();
    });

    it('should return 400 when invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/members/invalid-id')
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 401 when no auth token provided', async () => {
      const member = await SavedMember.create({
        userId: testUserId,
        name: 'Test Member',
      });

      await request(app).delete(`/api/v1/members/${member._id}`).expect(401);
    });
  });
});
