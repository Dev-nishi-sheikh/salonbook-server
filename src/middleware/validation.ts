import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
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
      const parsed = schema.parse(req.query);
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
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
      const parsed = schema.parse(req.params);
      Object.assign(req.params, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({ success: false, message: messages });
        return;
      }
      res.status(400).json({ success: false, message: 'Params validation failed' });
    }
  };
};