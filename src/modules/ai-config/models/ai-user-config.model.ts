import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { GEMINI_MODELS, GeminiModel } from '../constants/gemini-models';

export interface IAIUserConfig extends Omit<Document, 'model'> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: 'gemini';
  model: GeminiModel;
  // Sensitive: select: false — never returned unless explicitly requested via .select('+field').
  encryptedApiKey: string;
  apiKeyIv: string;
  apiKeyAuthTag: string;
  isActive: boolean;
}

const aiUserConfigSchema = new Schema<IAIUserConfig>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      enum: ['gemini'],
      required: true,
      default: 'gemini',
    },
    model: {
      type: String,
      enum: GEMINI_MODELS,
      required: true,
    },
    encryptedApiKey: { type: String, required: true, select: false },
    apiKeyIv: { type: String, required: true, select: false },
    apiKeyAuthTag: { type: String, required: true, select: false },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false }
);

// One Gemini configuration per user in V1.
aiUserConfigSchema.index({ userId: 1 }, { unique: true });

const AIUserConfig = model<IAIUserConfig>('AIUserConfig', aiUserConfigSchema);
export { AIUserConfig };
