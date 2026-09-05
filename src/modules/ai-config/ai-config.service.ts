import { Types } from 'mongoose';
import { AIUserConfig, IAIUserConfig } from './models/ai-user-config.model';
import { GeminiModel } from './constants/gemini-models';
import { encrypt } from '../../shared/utils/encryption.util';

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
}

export { AIConfigService };
