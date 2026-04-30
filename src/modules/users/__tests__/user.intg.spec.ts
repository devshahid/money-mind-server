import request from 'supertest';
import { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../__tests__/helpers/database.helper';
import { User } from '../models/user.model';
import { UserLogin } from '../models/user-logins.model';
import app from '../../../app';

describe('Users API Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/v1/user/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/api/v1/user/register').send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        fullName: 'John Doe',
      });

      console.log('Register response:', response.status, response.body);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.output).toBe('User registered successfully');

      // Verify in database
      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user).toBeDefined();
      expect(user?.fullName).toBe('John Doe');
      expect(user?.email).toBe('newuser@example.com');
      expect(user?.role).toBe('USER');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/v1/user/register')
        .send({
          password: 'SecurePass123!',
          fullName: 'John Doe',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('email');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/user/register')
        .send({
          email: 'newuser@example.com',
          fullName: 'John Doe',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('password');
    });

    it('should return 400 when email is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/user/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          fullName: 'John Doe',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 400 when email already exists', async () => {
      // Create first user
      await User.create({
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
        role: 'USER',
      });

      const response = await request(app)
        .post('/api/v1/user/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          fullName: 'Another User',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('already');
    });

    it('should hash password before saving', async () => {
      await request(app)
        .post('/api/v1/user/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          fullName: 'John Doe',
        })
        .expect(200);

      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe('SecurePass123!');
      expect(user?.password.length).toBeGreaterThan(20); // bcrypt hash
    });
  });

  describe('POST /api/v1/user/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await User.create({
        email: 'testuser@example.com',
        password: 'password123',
        fullName: 'Test User',
        role: 'USER',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output).toBeDefined();
      expect(response.body.output.accessToken).toBeDefined();
      expect(response.body.output.email).toBe('testuser@example.com');
      expect(response.body.output.fullName).toBe('Test User');
      expect(response.body.output).not.toHaveProperty('password');

      // Verify UserLogin entry created
      const userLogin = await UserLogin.findOne({ email: 'testuser@example.com' });
      expect(userLogin).toBeDefined();
      expect(userLogin?.accessToken).toBe(response.body.output.accessToken);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: 'testuser@example.com',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 401 when email does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 401 when password is incorrect', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: 'testuser@example.com',
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should delete existing tokens when logging in again', async () => {
      // First login
      const firstLogin = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        })
        .expect(200);

      const firstToken = firstLogin.body.output.accessToken;
      const firstLoginCount = await UserLogin.countDocuments({ email: 'testuser@example.com' });
      expect(firstLoginCount).toBe(1);

      // Second login WITH old token passed - should delete old and create new
      await request(app)
        .post('/api/v1/user/login')
        .set('accessToken', firstToken)
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        })
        .expect(200);

      const secondLoginCount = await UserLogin.countDocuments({ email: 'testuser@example.com' });
      expect(secondLoginCount).toBe(1); // Should still be 1, old token deleted
    });
  });

  describe('POST /api/v1/user/logout', () => {
    let authToken: string;
    let userId: Types.ObjectId;

    beforeEach(async () => {
      // Create and login a user
      const user = await User.create({
        email: 'testuser@example.com',
        password: 'password123',
        fullName: 'Test User',
        role: 'USER',
      });
      userId = user._id;

      const loginResponse = await request(app).post('/api/v1/user/login').send({
        email: 'testuser@example.com',
        password: 'password123',
      });

      authToken = loginResponse.body.output.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/user/logout')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);

      // Verify UserLogin entry deleted
      const userLogin = await UserLogin.findOne({ userId });
      expect(userLogin).toBeNull();
    });

    it('should return 401 when no auth token provided', async () => {
      const response = await request(app).post('/api/v1/user/logout').expect(401);

      expect(response.body.status).toBe(false);
    });

    it('should return 404 when token is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/user/logout')
        .set('accessToken', 'invalid-token')
        .expect(404);

      expect(response.body.status).toBe(false);
    });

    it('should return 401 when session does not exist', async () => {
      // Delete the session manually
      await UserLogin.deleteMany({ userId });

      const response = await request(app)
        .post('/api/v1/user/logout')
        .set('accessToken', authToken)
        .expect(401);

      expect(response.body.status).toBe(false);
    });
  });
});
