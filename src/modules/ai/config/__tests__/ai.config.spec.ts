/// <reference types="jest" />

import { Types } from 'mongoose';
import { resolveLLM } from '../ai.config';
import { AIUserConfig } from '../../../ai-config/models/ai-user-config.model';
import { GEMINI_OPENAI_COMPAT_BASE_URL } from '../../../ai-config/constants/gemini-models';
import * as encryptionUtil from '../../../../shared/utils/encryption.util';

jest.mock('../../../ai-config/models/ai-user-config.model', () => ({
  AIUserConfig: { findOne: jest.fn() },
}));
jest.mock('../../../../shared/utils/encryption.util');

const mockOllamaCtor = jest.fn().mockImplementation(() => ({ invoke: jest.fn() }));
jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation((...args) => mockOllamaCtor(...args)),
}));

// Both the OpenAI fallback and the Gemini path (via Gemini's OpenAI-compatible endpoint)
// go through ChatOpenAI now — distinguish calls by the presence of configuration.baseURL.
const mockChatOpenAICtor = jest.fn().mockImplementation(() => ({ invoke: jest.fn() }));
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((...args) => mockChatOpenAICtor(...args)),
}));

describe('resolveLLM', () => {
  const userId = new Types.ObjectId();
  let selectMock: jest.Mock;

  const geminiCalls = () =>
    mockChatOpenAICtor.mock.calls.filter(
      ([options]) => options?.configuration?.baseURL === GEMINI_OPENAI_COMPAT_BASE_URL
    );
  const openAiFallbackCalls = () =>
    mockChatOpenAICtor.mock.calls.filter(
      ([options]) => options?.configuration?.baseURL !== GEMINI_OPENAI_COMPAT_BASE_URL
    );

  beforeEach(() => {
    jest.clearAllMocks();
    selectMock = jest.fn();
    (AIUserConfig.findOne as jest.Mock).mockReturnValue({ select: selectMock });
  });

  it('falls back to createLLM() when no userId is provided', async () => {
    await resolveLLM(undefined);

    expect(AIUserConfig.findOne).not.toHaveBeenCalled();
    expect(mockOllamaCtor).toHaveBeenCalled();
    expect(geminiCalls()).toHaveLength(0);
  });

  it('falls back to createLLM() when the user has no configuration', async () => {
    selectMock.mockResolvedValue(null);

    await resolveLLM(userId);

    expect(AIUserConfig.findOne).toHaveBeenCalledWith({ userId, isActive: true });
    expect(mockOllamaCtor).toHaveBeenCalled();
    expect(geminiCalls()).toHaveLength(0);
  });

  it('does not match an inactive configuration (falls back to createLLM())', async () => {
    // isActive: true is part of the query itself, so an inactive doc is never returned.
    selectMock.mockResolvedValue(null);

    await resolveLLM(userId);

    expect(AIUserConfig.findOne).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    expect(geminiCalls()).toHaveLength(0);
  });

  it.each(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])(
    'returns a ChatOpenAI instance (Gemini-compatible endpoint) for %s built from the decrypted key and stored model',
    async (storedModel) => {
      selectMock.mockResolvedValue({
        model: storedModel,
        encryptedApiKey: 'cipher',
        apiKeyIv: 'iv',
        apiKeyAuthTag: 'tag',
      });
      (encryptionUtil.decrypt as jest.Mock).mockReturnValue('decrypted-api-key');

      await resolveLLM(userId, 0.4);

      expect(encryptionUtil.decrypt).toHaveBeenCalledWith({
        ciphertext: 'cipher',
        iv: 'iv',
        authTag: 'tag',
      });
      expect(geminiCalls()).toEqual([
        [
          expect.objectContaining({
            apiKey: 'decrypted-api-key',
            model: storedModel,
            temperature: 0.4,
            configuration: { baseURL: GEMINI_OPENAI_COMPAT_BASE_URL },
          }),
        ],
      ]);
      expect(mockOllamaCtor).not.toHaveBeenCalled();
      expect(openAiFallbackCalls()).toHaveLength(0);
    }
  );

  it('requests only the fields required to build the model (credential fields explicitly selected)', async () => {
    selectMock.mockResolvedValue({
      model: 'gemini-3.6-flash',
      encryptedApiKey: 'cipher',
      apiKeyIv: 'iv',
      apiKeyAuthTag: 'tag',
    });
    (encryptionUtil.decrypt as jest.Mock).mockReturnValue('decrypted-api-key');

    await resolveLLM(userId);

    expect(selectMock).toHaveBeenCalledWith('+encryptedApiKey +apiKeyIv +apiKeyAuthTag');
  });

  it('falls back to createLLM() when decryption fails (corrupted/tampered credential)', async () => {
    selectMock.mockResolvedValue({
      model: 'gemini-3.6-flash',
      encryptedApiKey: 'corrupted',
      apiKeyIv: 'iv',
      apiKeyAuthTag: 'tag',
    });
    (encryptionUtil.decrypt as jest.Mock).mockImplementation(() => {
      throw new Error(
        'Failed to decrypt payload: data may be corrupted, tampered, or the key is wrong'
      );
    });

    const llm = await resolveLLM(userId);

    expect(llm).toBeDefined();
    expect(geminiCalls()).toHaveLength(0);
    expect(mockOllamaCtor).toHaveBeenCalled();
  });

  it('never returns or logs the decrypted API key', async () => {
    selectMock.mockResolvedValue({
      model: 'gemini-3.6-flash',
      encryptedApiKey: 'cipher',
      apiKeyIv: 'iv',
      apiKeyAuthTag: 'tag',
    });
    (encryptionUtil.decrypt as jest.Mock).mockReturnValue('super-secret-plaintext-key');
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const llm = await resolveLLM(userId);

    expect(JSON.stringify(llm)).not.toContain('super-secret-plaintext-key');
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('super-secret-plaintext-key');
    }
    consoleSpy.mockRestore();
  });
});
