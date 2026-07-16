import Joi from 'joi';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

/**
 * Transaction Request Validation Schemas
 */

// Upload transactions from file
export const uploadLogsSchema = Joi.object({
  rows: Joi.array().items(Joi.object()).min(1).required(),
  bankName: Joi.string().required(),
});

// Preview upload
export const previewUploadSchema = Joi.object({
  rows: Joi.array().items(Joi.object()).min(1).required(),
  bankName: Joi.string().required(),
});

// Fetch transactions (filters)
export const fetchTransactionsSchema = Joi.object({
  uploadKey: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  amount: Joi.number().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  bankName: Joi.string().optional(),
  transactionType: Joi.string().valid('credit', 'debit').optional(),
  type: Joi.string().optional(),
  labels: Joi.array().items(Joi.string()).optional(),
  category: Joi.array()
    .items(Joi.string().valid(...EXPENSE_CATEGORIES, 'Uncategorized'))
    .optional(),
  keyword: Joi.string().optional(),
});

// Bulk update transactions
export const bulkUpdateSchema = Joi.object({
  transactions: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().required(),
        category: Joi.string()
          .valid(...EXPENSE_CATEGORIES)
          .optional(),
        labels: Joi.array().items(Joi.string()).optional(),
        narration: Joi.string().optional(),
        amount: Joi.number().optional(),
        transactionDate: Joi.date().optional(),
      })
    )
    .min(1)
    .required(),
  uploadKey: Joi.string().optional(),
  bankName: Joi.string().optional(),
});

// Update single transaction
export const updateTransactionSchema = Joi.object({
  narration: Joi.string().optional(),
  amount: Joi.number().optional(),
  transactionDate: Joi.date().optional(),
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .optional(),
  labels: Joi.array().items(Joi.string()).optional(),
  groupId: Joi.string().optional(),
  isCredit: Joi.boolean().optional(),
});

// Transaction ID param validation
export const transactionIdSchema = Joi.object({
  id: Joi.string().required(),
});

/**
 * Validation middleware factory
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
