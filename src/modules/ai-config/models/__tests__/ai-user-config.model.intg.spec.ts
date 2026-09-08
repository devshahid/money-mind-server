/// <reference types="jest" />

import mongoose, { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../../__tests__/helpers/database.helper';
import { AIUserConfig } from '../ai-user-config.model';

describe('AIUserConfig model', () => {
  const validDoc = () => ({
    userId: new Types.ObjectId(),
    provider: 'gemini' as const,
    model: 'gemini-3.6-flash',
    encryptedApiKey: 'ciphertext-base64',
    apiKeyIv: 'iv-base64',
    apiKeyAuthTag: 'auth-tag-base64',
  });

  beforeAll(async () => {
    await connectTestDatabase();
    // Ensure the unique userId index is built before tests rely on it.
    await AIUserConfig.init();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('creates a valid document with timestamps', async () => {
    const doc = await AIUserConfig.create(validDoc());

    expect(doc._id).toBeDefined();
    expect(doc.provider).toBe('gemini');
    expect(doc.model).toBe('gemini-3.6-flash');
    expect(doc.isActive).toBe(true);
    expect((doc as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
    expect((doc as unknown as { updatedAt: Date }).updatedAt).toBeInstanceOf(Date);
    expect((doc as unknown as { __v: unknown }).__v).toBeUndefined();
  });

  it('defaults isActive to true when not provided', async () => {
    const doc = await AIUserConfig.create(validDoc());
    expect(doc.isActive).toBe(true);
  });

  it.each(['userId', 'model', 'encryptedApiKey', 'apiKeyIv', 'apiKeyAuthTag'])(
    'requires %s',
    async (field) => {
      const data = validDoc() as Record<string, unknown>;
      delete data[field];

      await expect(AIUserConfig.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
    }
  );

  it('rejects a provider other than "gemini"', async () => {
    await expect(AIUserConfig.create({ ...validDoc(), provider: 'openai' })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('rejects a model not in the allow-list', async () => {
    await expect(
      AIUserConfig.create({ ...validDoc(), model: 'gemini-1.0-unsupported' })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('does not return sensitive fields on a default query', async () => {
    await AIUserConfig.create(validDoc());

    const found = await AIUserConfig.findOne({});

    expect(found).not.toBeNull();
    expect(found!.encryptedApiKey).toBeUndefined();
    expect(found!.apiKeyIv).toBeUndefined();
    expect(found!.apiKeyAuthTag).toBeUndefined();
  });

  it('returns sensitive fields only when explicitly selected', async () => {
    await AIUserConfig.create(validDoc());

    const found = await AIUserConfig.findOne({}).select(
      '+encryptedApiKey +apiKeyIv +apiKeyAuthTag'
    );

    expect(found!.encryptedApiKey).toBe('ciphertext-base64');
    expect(found!.apiKeyIv).toBe('iv-base64');
    expect(found!.apiKeyAuthTag).toBe('auth-tag-base64');
  });

  it('enforces one configuration per userId', async () => {
    const data = validDoc();
    await AIUserConfig.create(data);

    await expect(AIUserConfig.create({ ...validDoc(), userId: data.userId })).rejects.toThrow();
  });

  it('allows different users to each have their own configuration', async () => {
    await AIUserConfig.create(validDoc());
    await expect(AIUserConfig.create(validDoc())).resolves.toBeDefined();
  });
});
