import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import { hasSufficientAdminLevel } from '../utils/admin-level.js';

const orm = prisma.orm as any;

export const requireAdminLevel = (minimumExclusiveLevel: number) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Forbidden: administrator access required', 403);
      }

      const admin = await orm.public.Admin.where({ id: Number(req.user.id) }).first();
      if (
        !admin ||
        !hasSufficientAdminLevel(Number(admin.role), minimumExclusiveLevel)
      ) {
        throw new AppError('Forbidden: insufficient administrator role', 403);
      }

      return next();
    } catch (error) {
      return next(error instanceof AppError ? error : new AppError('Authorization failed', 403));
    }
  };
};