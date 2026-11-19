import { Request, Response, NextFunction } from 'express';

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const record = this.requests.get(key);

      if (!record || now > record.resetTime) {
        this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
        next();
        return;
      }

      if (record.count >= this.maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
        });
        return;
      }

      record.count++;
      next();
    };
  }
}

export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 10).middleware();
export const apiRateLimiter = new RateLimiter(60 * 1000, 60).middleware();