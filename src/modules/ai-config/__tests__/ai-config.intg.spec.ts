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
import { AIUserConfig } from '../models/ai-user-config.model';
import jwtHandler from '../../../shared/core/jwtHandler';

// No real Gemini calls in tests — mock the LangChain Gemini client entirely.
const mockInvoke = jest.fn();
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({ invoke: mockInvoke })),
}));

describe('AI Config API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: Types.ObjectId;

  const createAuthenticatedUser = async (email: string) => {
    const user = await User.create({
      email,
      password: 'password123',
      fullName: 'Test User',
      role: 'USER',
    });

    const token = jwtHandler.createJwtToken({
      email: user.email,
      userId: user._id,
      userType: 'USER',
    });

    await UserLogin.create({
      userId: user._id,
      email: user.email,
      accessToken: token,
    });

    return { userId: user._id, token };
  };

  beforeAll(async () => {
    await connectTestDatabase();
    await AIUserConfig.init();
    const appModule = await import('../../../app');
    app = appModule.default;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    mockInvoke.mockReset();
    const { userId, token } = await createAuthenticatedUser('test@example.com');
    testUserId = userId;
    authToken = token;
  });

  describe('GET /api/v1/ai/config', () => {
    it('returns configured: false when the user has no configuration', async () => {
      const response = await request(app)
        .get('/api/v1/ai/config')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.output).toEqual({ configured: false });
    });

    it('returns the safe configuration when one exists', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      const response = await request(app)
        .get('/api/v1/ai/config')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.output).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        isActive: true,
      });
    });

    it('returns 401 when no auth token provided', async () => {
      await request(app).get('/api/v1/ai/config').expect(401);
    });
  });

  describe('PUT /api/v1/ai/config', () => {
    it('creates a configuration and never returns credential fields', async () => {
      const response = await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      expect(response.body.output).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        isActive: true,
      });
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('test-gemini-api-key');
      expect(responseText).not.toContain('encryptedApiKey');
      expect(responseText).not.toContain('apiKeyIv');
      expect(responseText).not.toContain('apiKeyAuthTag');
    });

    it('persists the API key encrypted, never in plaintext', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      const stored = await AIUserConfig.findOne({ userId: testUserId }).select(
        '+encryptedApiKey +apiKeyIv +apiKeyAuthTag'
      );

      expect(stored).not.toBeNull();
      expect(stored!.encryptedApiKey).not.toBe('test-gemini-api-key');
      expect(stored!.encryptedApiKey).not.toContain('test-gemini-api-key');
    });

    it('replaces an existing configuration for the same user', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'first-key' })
        .expect(200);

      const response = await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-pro', apiKey: 'second-key' })
        .expect(200);

      expect(response.body.output.model).toBe('gemini-2.5-pro');

      const count = await AIUserConfig.countDocuments({ userId: testUserId });
      expect(count).toBe(1);
    });

    it('returns 400 for an invalid model', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'not-a-real-model', apiKey: 'test-gemini-api-key' })
        .expect(400);
    });

    it('returns 400 when apiKey is missing', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash' })
        .expect(400);
    });

    it('returns 401 when no auth token provided', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/ai/config', () => {
    it('deletes the configuration for the authenticated user', async () => {
      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      await request(app).delete('/api/v1/ai/config').set('accessToken', authToken).expect(200);

      const stored = await AIUserConfig.findOne({ userId: testUserId });
      expect(stored).toBeNull();
    });

    it('returns 401 when no auth token provided', async () => {
      await request(app).delete('/api/v1/ai/config').expect(401);
    });
  });

  describe('POST /api/v1/ai/config/test', () => {
    it('returns success when Gemini responds and does not persist anything', async () => {
      mockInvoke.mockResolvedValue({ content: 'pong' });

      const response = await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      expect(response.body.output).toEqual({ success: true });

      const stored = await AIUserConfig.findOne({ userId: testUserId });
      expect(stored).toBeNull();
    });

    it('never returns the API key in the response', async () => {
      mockInvoke.mockResolvedValue({ content: 'pong' });

      const response = await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('test-gemini-api-key');
    });

    it('returns 400 and a sanitized message for an invalid API key', async () => {
      mockInvoke.mockRejectedValue({ status: 401, message: 'API key not valid' });

      const response = await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'bad-key' })
        .expect(400);

      expect(response.body.message).toMatch(/invalid or unauthorized gemini api key/i);
      expect(JSON.stringify(response.body)).not.toContain('bad-key');
    });

    it('returns 400 and a sanitized message for an unsupported model at the provider', async () => {
      mockInvoke.mockRejectedValue({ status: 404, message: 'models/foo is not found' });

      const response = await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(400);

      expect(response.body.message).toMatch(/invalid or unsupported gemini model/i);
    });

    it('returns a sanitized error (not the raw provider payload) for a provider/network failure', async () => {
      mockInvoke.mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

      const response = await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(502);

      expect(response.body.message).toMatch(/unable to reach gemini/i);
      expect(response.body.message).not.toMatch(/econnrefused/i);
    });

    it('returns 400 for an invalid model without calling Gemini', async () => {
      await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'not-a-real-model', apiKey: 'test-gemini-api-key' })
        .expect(400);

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('returns 400 when apiKey is missing', async () => {
      await request(app)
        .post('/api/v1/ai/config/test')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash' })
        .expect(400);

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('returns 401 when no auth token provided', async () => {
      await request(app)
        .post('/api/v1/ai/config/test')
        .send({ model: 'gemini-2.5-flash', apiKey: 'test-gemini-api-key' })
        .expect(401);

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('user scoping', () => {
    it("does not expose or delete another user's configuration", async () => {
      const { token: otherToken } = await createAuthenticatedUser('other@example.com');

      await request(app)
        .put('/api/v1/ai/config')
        .set('accessToken', authToken)
        .send({ model: 'gemini-2.5-flash', apiKey: 'user-a-key' })
        .expect(200);

      // User B has no configuration of their own.
      const otherGet = await request(app)
        .get('/api/v1/ai/config')
        .set('accessToken', otherToken)
        .expect(200);
      expect(otherGet.body.output).toEqual({ configured: false });

      // User B deleting "their" config must not affect user A's configuration.
      await request(app).delete('/api/v1/ai/config').set('accessToken', otherToken).expect(200);

      const userAConfig = await request(app)
        .get('/api/v1/ai/config')
        .set('accessToken', authToken)
        .expect(200);
      expect(userAConfig.body.output.configured).toBe(true);
    });
  });
});
