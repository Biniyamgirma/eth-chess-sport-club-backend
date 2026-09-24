import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import { verifyToken } from '../utils/jwt.js';

const orm = prisma.orm as any;

const findUserByRole = async (role: 'admin' | 'vendor' | 'member', userId: number | string) => {
  switch (role) {
    case 'admin':
      return (await orm.public.Admin.where({ id: Number(userId) }).first()) ?? null;
    case 'vendor':
      return (await orm.public.Vendor.where({ id: Number(userId) }).first()) ?? null;
    case 'member':
      return (await orm.public.Member.where({ id: String(userId) }).first()) ?? null;
    default:
      return null;
  }
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies?.token;
    const token = bearerToken ?? cookieToken;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token);
    const user = await findUserByRole(payload.role, payload.userId);

    if (!user) {
      throw new AppError('User no longer exists or access is revoked', 401);
    }

    req.user = {
      id: payload.userId,
      role: payload.role,
      type: payload.role,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError('Invalid or expired token', 401));
  }
};
