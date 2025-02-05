import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult, ValidationError } from 'express-validator';
import { AppError } from './error';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
    }));

    next(AppError.badRequest(JSON.stringify(formattedErrors)));
  };
}; 