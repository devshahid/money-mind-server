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
