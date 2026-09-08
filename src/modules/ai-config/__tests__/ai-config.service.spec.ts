/// <reference types="jest" />

import { Types } from 'mongoose';
import { AIConfigService } from '../ai-config.service';
import { AIUserConfig } from '../models/ai-user-config.model';
import * as encryptionUtil from '../../../shared/utils/encryption.util';
import { ChatOpenAI } from '@langchain/openai';
import { GEMINI_OPENAI_COMPAT_BASE_URL } from '../constants/gemini-models';
import { CustomError } from '../../../shared/core/ApiError';

jest.mock('../models/ai-user-config.model', () => ({
  AIUserConfig: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  },
}));
jest.mock('../../../shared/utils/encryption.util');

const mockInvoke = jest.fn();
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({ invoke: mockInvoke })),
}));

describe('AIConfigService (Unit Tests)', () => {
  let service: AIConfigService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AIConfigService();
  });

  describe('getConfig', () => {
    it('returns configured: false when no document exists', async () => {
      (AIUserConfig.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getConfig(mockUserId);

      expect(result).toEqual({ configured: false });
      expect(AIUserConfig.findOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('returns a safe DTO scoped to the given userId', async () => {
      (AIUserConfig.findOne as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
      });

      const result = await service.getConfig(mockUserId);

      expect(result).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
      });
    });

    it('never includes credential fields in the safe DTO', async () => {
      (AIUserConfig.findOne as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
        encryptedApiKey: 'should-never-leak',
        apiKeyIv: 'should-never-leak',
        apiKeyAuthTag: 'should-never-leak',
      });

      const result = await service.getConfig(mockUserId);

      expect(result).not.toHaveProperty('encryptedApiKey');
      expect(result).not.toHaveProperty('apiKeyIv');
      expect(result).not.toHaveProperty('apiKeyAuthTag');
    });
  });

  describe('upsertConfig', () => {
    it('encrypts the API key before persisting', async () => {
      (encryptionUtil.encrypt as jest.Mock).mockReturnValue({
        ciphertext: 'cipher',
        iv: 'iv-value',
        authTag: 'tag-value',
      });
      (AIUserConfig.findOneAndUpdate as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
      });

      await service.upsertConfig(mockUserId, 'gemini-3.6-flash', 'plaintext-api-key');

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('plaintext-api-key');
      expect(AIUserConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId },
        expect.objectContaining({
          userId: mockUserId,
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          encryptedApiKey: 'cipher',
          apiKeyIv: 'iv-value',
          apiKeyAuthTag: 'tag-value',
          isActive: true,
        }),
        expect.objectContaining({ upsert: true, new: true })
      );
    });

    it('never persists the plaintext API key', async () => {
      (encryptionUtil.encrypt as jest.Mock).mockReturnValue({
        ciphertext: 'cipher',
        iv: 'iv-value',
        authTag: 'tag-value',
      });
      (AIUserConfig.findOneAndUpdate as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
      });

      await service.upsertConfig(mockUserId, 'gemini-3.6-flash', 'super-secret-plaintext-key');

      const [, updatePayload] = (AIUserConfig.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(JSON.stringify(updatePayload)).not.toContain('super-secret-plaintext-key');
    });

    it('replaces an existing configuration for the same user (upsert)', async () => {
      (encryptionUtil.encrypt as jest.Mock).mockReturnValue({
        ciphertext: 'cipher-2',
        iv: 'iv-2',
        authTag: 'tag-2',
      });
      (AIUserConfig.findOneAndUpdate as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        isActive: true,
      });

      const result = await service.upsertConfig(mockUserId, 'gemini-3.5-flash-lite', 'new-key');

      expect(result).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        isActive: true,
      });
    });

    it('returns a safe DTO that never contains credential fields', async () => {
      (encryptionUtil.encrypt as jest.Mock).mockReturnValue({
        ciphertext: 'cipher',
        iv: 'iv-value',
        authTag: 'tag-value',
      });
      (AIUserConfig.findOneAndUpdate as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        isActive: true,
        encryptedApiKey: 'cipher',
        apiKeyIv: 'iv-value',
        apiKeyAuthTag: 'tag-value',
      });

      const result = await service.upsertConfig(mockUserId, 'gemini-3.6-flash', 'plaintext-key');

      expect(result).not.toHaveProperty('encryptedApiKey');
      expect(result).not.toHaveProperty('apiKeyIv');
      expect(result).not.toHaveProperty('apiKeyAuthTag');
    });
  });

  describe('deleteConfig', () => {
    it("deletes only the given user's configuration", async () => {
      (AIUserConfig.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await service.deleteConfig(mockUserId);

      expect(AIUserConfig.deleteOne).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('testConnection', () => {
    it.each(['gemini-3.6-flash', 'gemini-3.5-flash-lite'] as const)(
      'returns success when Gemini responds for %s (via the OpenAI-compatible endpoint)',
      async (model) => {
        mockInvoke.mockResolvedValue({ content: 'pong' });

        const result = await service.testConnection(model, 'valid-key');

        expect(result).toEqual({ success: true });
        expect(ChatOpenAI).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: 'valid-key',
            model,
            configuration: { baseURL: GEMINI_OPENAI_COMPAT_BASE_URL },
          })
        );
        expect(mockInvoke).toHaveBeenCalledWith('ping');
      }
    );

    it('maps a 401/403 failure to an invalid-credential error', async () => {
      mockInvoke.mockRejectedValue({ status: 401, message: 'Request had invalid authentication' });

      await expect(service.testConnection('gemini-3.6-flash', 'bad-key')).rejects.toThrow(
        CustomError
      );
      await expect(service.testConnection('gemini-3.6-flash', 'bad-key')).rejects.toThrow(
        /invalid or unauthorized gemini api key/i
      );
    });

    it('maps an "API key not valid" message to an invalid-credential error', async () => {
      mockInvoke.mockRejectedValue(new Error('API key not valid. Please pass a valid API key.'));

      await expect(service.testConnection('gemini-3.6-flash', 'bad-key')).rejects.toThrow(
        /invalid or unauthorized gemini api key/i
      );
    });

    it('maps a 404/model-not-found failure to an invalid-model error', async () => {
      mockInvoke.mockRejectedValue({ status: 404, message: 'The model `foo` does not exist' });

      await expect(service.testConnection('gemini-3.6-flash', 'valid-key')).rejects.toThrow(
        /invalid or unsupported gemini model/i
      );
    });

    it('does not misclassify a non-404 SDK/API compatibility failure as an invalid model', async () => {
      // Regression guard: an error that merely mentions "model" in its message (but isn't
      // a genuine 404 from the provider) must not be reported as an invalid model.
      mockInvoke.mockRejectedValue(new Error('model endpoint temporarily unavailable'));

      await expect(service.testConnection('gemini-3.6-flash', 'valid-key')).rejects.toThrow(
        /unable to reach gemini/i
      );
    });

    it('maps an unrecognized/network failure to a generic provider error', async () => {
      mockInvoke.mockRejectedValue(new Error('fetch failed'));

      await expect(service.testConnection('gemini-3.6-flash', 'valid-key')).rejects.toThrow(
        /unable to reach gemini/i
      );
    });

    it('never leaks the raw provider error or the API key in the thrown error', async () => {
      mockInvoke.mockRejectedValue({
        status: 401,
        message: 'invalid API key: super-secret-plaintext-key',
      });

      try {
        await service.testConnection('gemini-3.6-flash', 'super-secret-plaintext-key');
        throw new Error('expected testConnection to throw');
      } catch (error) {
        expect((error as Error).message).not.toContain('super-secret-plaintext-key');
      }
    });
  });
});
