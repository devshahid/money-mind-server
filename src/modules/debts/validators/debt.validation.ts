import Joi from 'joi';

/**
 * Validation schema for recording a debt payment
 */
export const recordPaymentSchema = Joi.object({
  debtId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid debt ID format',
      'any.required': 'Debt ID is required',
    }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Payment amount must be greater than 0',
    'any.required': 'Payment amount is required',
  }),
  paymentDate: Joi.date().iso().required().messages({
    'date.format': 'Payment date must be a valid ISO date',
    'any.required': 'Payment date is required',
  }),
  transactionId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid transaction ID format',
    }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Notes must not exceed 500 characters',
  }),
});

/**
 * Validation schema for adding a new debt
 */
export const addDebtSchema = Joi.object({
  debtDetails: Joi.object({
    debtName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Debt name must be at least 2 characters',
      'string.max': 'Debt name must not exceed 100 characters',
      'any.required': 'Debt name is required',
    }),
    startDate: Joi.date().iso().required().messages({
      'date.format': 'Start date must be a valid ISO date',
      'any.required': 'Start date is required',
    }),
    expectedEndDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
      'date.format': 'Expected end date must be a valid ISO date',
      'date.greater': 'Expected end date must be after start date',
      'any.required': 'Expected end date is required',
    }),
    totalAmount: Joi.number().positive().required().messages({
      'number.positive': 'Total amount must be greater than 0',
      'any.required': 'Total amount is required',
    }),
    remainingAmount: Joi.number().min(0).max(Joi.ref('totalAmount')).required().messages({
      'number.min': 'Remaining amount cannot be negative',
      'number.max': 'Remaining amount cannot exceed total amount',
      'any.required': 'Remaining amount is required',
    }),
    interestRate: Joi.number().min(0).max(100).required().messages({
      'number.min': 'Interest rate cannot be negative',
      'number.max': 'Interest rate cannot exceed 100%',
      'any.required': 'Interest rate is required',
    }),
    debtStatus: Joi.string().valid('ACTIVE', 'PAID', 'OVERDUE').required().messages({
      'any.only': 'Debt status must be ACTIVE, PAID, or OVERDUE',
      'any.required': 'Debt status is required',
    }),
    monthlyExpectedEMI: Joi.number().positive().required().messages({
      'number.positive': 'Monthly expected EMI must be greater than 0',
      'any.required': 'Monthly expected EMI is required',
    }),
    monthlyActualEMI: Joi.number().positive().required().messages({
      'number.positive': 'Monthly actual EMI must be greater than 0',
      'any.required': 'Monthly actual EMI is required',
    }),
    partPayment: Joi.number().min(0).optional(),
    paymentDate: Joi.date().iso().required().messages({
      'date.format': 'Payment date must be a valid ISO date',
      'any.required': 'Payment date is required',
    }),
    lender: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Lender name must be at least 2 characters',
      'string.max': 'Lender name must not exceed 100 characters',
    }),
    emiType: Joi.string().valid('INTEREST_ONLY', 'PRINCIPAL_AND_INTEREST').optional().messages({
      'any.only': 'EMI type must be INTEREST_ONLY or PRINCIPAL_AND_INTEREST',
    }),
    principalComponent: Joi.number().min(0).optional().messages({
      'number.min': 'Principal component cannot be negative',
    }),
    interestComponent: Joi.number().min(0).optional().messages({
      'number.min': 'Interest component cannot be negative',
    }),
  }).required(),
});

/**
 * Validation schema for updating a debt
 */
export const updateDebtSchema = Joi.object({
  debtId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid debt ID format',
      'any.required': 'Debt ID is required',
    }),
  debtDetails: Joi.object({
    debtName: Joi.string().min(2).max(100).optional(),
    startDate: Joi.date().iso().optional(),
    expectedEndDate: Joi.date().iso().optional(),
    totalAmount: Joi.number().positive().optional(),
    remainingAmount: Joi.number().min(0).optional(),
    interestRate: Joi.number().min(0).max(100).optional(),
    debtStatus: Joi.string().valid('ACTIVE', 'PAID', 'OVERDUE').optional(),
    monthlyExpectedEMI: Joi.number().positive().optional(),
    monthlyActualEMI: Joi.number().positive().optional(),
    partPayment: Joi.number().min(0).optional(),
    paymentDate: Joi.date().iso().optional(),
    lender: Joi.string().min(2).max(100).optional(),
    emiType: Joi.string().valid('INTEREST_ONLY', 'PRINCIPAL_AND_INTEREST').optional(),
    principalComponent: Joi.number().min(0).optional(),
    interestComponent: Joi.number().min(0).optional(),
  })
    .min(1)
    .required()
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),
});

/**
 * Validation schema for debt ID parameter
 */
export const debtIdParamSchema = Joi.object({
  debtId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid debt ID format',
      'any.required': 'Debt ID is required',
    }),
});
