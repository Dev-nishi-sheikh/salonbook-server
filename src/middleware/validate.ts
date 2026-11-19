import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AuthenticatedRequest } from '../types';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({ success: false, message: messages });
        return;
      }
      res.status(400).json({ success: false, message: 'Validation failed' });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({ success: false, message: messages });
        return;
      }
      res.status(400).json({ success: false, message: 'Query validation failed' });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({ success: false, message: messages });
        return;
      }
      res.status(400).json({ success: false, message: 'Params validation failed' });
    }
  };
};