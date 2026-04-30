import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ClientError } from '../../../shared/core/ApiError';

/**
 * Factory function to create validation middleware
 */
export const validateRequest = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      throw new ClientError(errorMessage, 400);
    }
    next();
  };
};

/**
 * Schema for creating a new member
 */
export const createMemberSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required',
  }),
});

/**
 * Schema for deleting a member (ID param)
 */
export const deleteMemberSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid member ID format',
      'any.required': 'Member ID is required',
    }),
});
