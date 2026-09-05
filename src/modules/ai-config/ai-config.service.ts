import { Types } from 'mongoose';
import { ChatOpenAI } from '@langchain/openai';
import { AIUserConfig, IAIUserConfig } from './models/ai-user-config.model';
import { GeminiModel, GEMINI_OPENAI_COMPAT_BASE_URL } from './constants/gemini-models';
import { encrypt } from '../../shared/utils/encryption.util';
import { CustomError } from '../../shared/core/ApiError';

export interface SafeAIConfig {
  configured: boolean;
  provider?: 'gemini';
  model?: GeminiModel;
  isActive?: boolean;
}

// Explicit allow-list mapping — never spreads the document, so a new sensitive
// field added to the schema later cannot leak here by accident.
function toSafeConfig(doc: IAIUserConfig | null): SafeAIConfig {
  if (!doc) return { configured: false };

  return {
    configured: true,
    provider: doc.provider,
    model: doc.model,
    isActive: doc.isActive,
  };
}

// Maps a raw Gemini/LangChain failure to a safe, generic application error.
// Never surfaces the raw provider error object/payload to the caller.
//
// Only a genuine HTTP 404 from the provider is treated as an invalid model — matching
// on the word "model" in the message was too broad and could misclassify unrelated
// SDK/API compatibility failures (e.g. transport/version errors) as a bad model ID.
function mapGeminiTestError(error: unknown): CustomError {
  const status = (error as { status?: number })?.status;
  const message = ((error as { message?: string })?.message || '').toLowerCase();

  if (status === 401 || status === 403 || message.includes('api key')) {
    return new CustomError('Invalid or unauthorized Gemini API key', 400);
  }
  if (status === 404) {
    return new CustomError('Invalid or unsupported Gemini model', 400);
  }
  return new CustomError('Unable to reach Gemini. Please try again later.', 502);
}

class AIConfigService {
  async getConfig(userId: Types.ObjectId | string): Promise<SafeAIConfig> {
    const doc = await AIUserConfig.findOne({ userId });
    return toSafeConfig(doc);
  }

  async upsertConfig(
    userId: Types.ObjectId | string,
    model: GeminiModel,
    apiKey: string
  ): Promise<SafeAIConfig> {
    const { ciphertext, iv, authTag } = encrypt(apiKey);

    const doc = await AIUserConfig.findOneAndUpdate(
      { userId },
      {
        userId,
        provider: 'gemini',
        model,
        encryptedApiKey: ciphertext,
        apiKeyIv: iv,
        apiKeyAuthTag: authTag,
        isActive: true,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return toSafeConfig(doc);
  }

  async deleteConfig(userId: Types.ObjectId | string): Promise<void> {
    await AIUserConfig.deleteOne({ userId });
  }

  async testConnection(model: GeminiModel, apiKey: string): Promise<{ success: true }> {
    const llm = new ChatOpenAI({
      apiKey,
      model,
      temperature: 0,
      maxTokens: 1,
      configuration: { baseURL: GEMINI_OPENAI_COMPAT_BASE_URL },
    });

    try {
      await llm.invoke('ping');
    } catch (error) {
      throw mapGeminiTestError(error);
    }

    return { success: true };
  }
}

export { AIConfigService };
