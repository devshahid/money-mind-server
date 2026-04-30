import Joi from 'joi';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

/**
 * AI Request Validation Schemas using Joi
 * Following pattern from digital-logbook-backend
 */

// Suggest Categories Request
export const suggestCategoriesSchema = Joi.object({
  transactionIds: Joi.array().items(Joi.string()).optional(),
  all: Joi.boolean().optional(),
}).or('transactionIds', 'all');

// Apply Suggestions Request
export const applySuggestionsSchema = Joi.object({
  suggestions: Joi.array()
    .items(
      Joi.object({
        transactionId: Joi.string().required(),
        suggestedCategory: Joi.string()
          .valid(...EXPENSE_CATEGORIES)
          .required(),
      })
    )
    .min(1)
    .required(),
});

// Reject Suggestions Request
export const rejectSuggestionsSchema = Joi.object({
  transactionIds: Joi.array().items(Joi.string()).min(1).required(),
});

// Chat Request
export const chatRequestSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  sessionId: Joi.string().uuid().optional(),
});

// Get Chat History Request (query params)
export const getChatHistorySchema = Joi.object({
  sessionId: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

// Clear Chat History Request (params)
export const clearChatHistorySchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
});

// Debt Strategy Request
export const debtStrategySchema = Joi.object({
  monthlyIncome: Joi.number().positive().optional(),
});

// Budget Recommendations Request
export const budgetRecommendationsSchema = Joi.object({
  monthlyIncome: Joi.number().positive().optional(),
});

/**
 * Validation middleware factory
 * Creates Express middleware for request validation
 */
export function validateRequest(
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (
    req: { body: object; query: object; params: object },
    res: {
      status: (code: number) => {
        json: (data: { status: number; message: string; errors?: unknown }) => void;
      };
    },
    next: () => void
  ) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        status: 400,
        message: 'Validation error',
        errors: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    // Replace request data with validated/sanitized value
    if (source === 'body') req.body = value;
    else if (source === 'query') req.query = value;
    else req.params = value;

    next();
  };
}
