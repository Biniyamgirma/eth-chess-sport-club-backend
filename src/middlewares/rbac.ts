import type { NextFunction, Request, Response } from 'express';

import { AppError } from './errorHandler.js';

export const requireRole = (allowedRoles: Array<'admin' | 'vendor' | 'member'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Forbidden: you do not have access to this resource', 403));
    }

    return next();
  };
};
