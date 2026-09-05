import Joi from 'joi';
import { GEMINI_MODELS } from '../constants/gemini-models';

/**
 * Validation schema for PUT /ai/config
 */
export const upsertAIConfigSchema = Joi.object({
  model: Joi.string()
    .valid(...GEMINI_MODELS)
    .required()
    .messages({
      'any.only': `Model must be one of: ${GEMINI_MODELS.join(', ')}`,
      'any.required': 'Model is required',
    }),
  apiKey: Joi.string().trim().min(1).required().messages({
    'string.empty': 'API key is required',
    'any.required': 'API key is required',
  }),
});
