/// <reference types="jest" />

import { Types } from 'mongoose';
import { AIConfigService } from '../ai-config.service';
import { AIUserConfig } from '../models/ai-user-config.model';
import * as encryptionUtil from '../../../shared/utils/encryption.util';

jest.mock('../models/ai-user-config.model', () => ({
  AIUserConfig: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  },
}));
jest.mock('../../../shared/utils/encryption.util');

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
        model: 'gemini-2.5-flash',
        isActive: true,
      });

      const result = await service.getConfig(mockUserId);

      expect(result).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        isActive: true,
      });
    });

    it('never includes credential fields in the safe DTO', async () => {
      (AIUserConfig.findOne as jest.Mock).mockResolvedValue({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
        isActive: true,
      });

      await service.upsertConfig(mockUserId, 'gemini-2.5-flash', 'plaintext-api-key');

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('plaintext-api-key');
      expect(AIUserConfig.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId },
        expect.objectContaining({
          userId: mockUserId,
          provider: 'gemini',
          model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
        isActive: true,
      });

      await service.upsertConfig(mockUserId, 'gemini-2.5-flash', 'super-secret-plaintext-key');

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
        model: 'gemini-2.5-pro',
        isActive: true,
      });

      const result = await service.upsertConfig(mockUserId, 'gemini-2.5-pro', 'new-key');

      expect(result).toEqual({
        configured: true,
        provider: 'gemini',
        model: 'gemini-2.5-pro',
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
        model: 'gemini-2.5-flash',
        isActive: true,
        encryptedApiKey: 'cipher',
        apiKeyIv: 'iv-value',
        apiKeyAuthTag: 'tag-value',
      });

      const result = await service.upsertConfig(mockUserId, 'gemini-2.5-flash', 'plaintext-key');

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
});
