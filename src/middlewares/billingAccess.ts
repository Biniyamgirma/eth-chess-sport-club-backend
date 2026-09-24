import type { NextFunction, Request, Response } from 'express';

import { AppError } from './errorHandler.js';

export const requireBillingAccess = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'vendor') {
    return next(new AppError('Forbidden: administrator or venue owner access required', 403));
  }

  return next();
};