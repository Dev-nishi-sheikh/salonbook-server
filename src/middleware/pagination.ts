import { Request, Response, NextFunction } from 'express';

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export const paginate = (options: PaginationOptions = {}) => {
  const { defaultLimit = 10, maxLimit = 100 } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
    const skip = (page - 1) * limit;

    req.pagination = { page, limit, skip };
    next();
  };
};

declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        skip: number;
      };
    }
  }
}

export const buildPaginationResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};