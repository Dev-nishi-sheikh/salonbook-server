import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({ success: false, message: messages });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map(e => e.message).join('; ');
    res.status(400).json({ success: false, message: messages });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: 'Invalid ID format' });
    return;
  }

  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    res.status(400).json({ success: false, message: `${field} already exists` });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};