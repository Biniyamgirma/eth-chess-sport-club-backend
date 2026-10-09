import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import { verifyToken } from '../utils/jwt.js';

const orm = prisma.orm as any;

const BOT_SECRET_HEADER = 'x-ethchess-bot-secret';

const safeEqual = (a: string, b: string) => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const isValidBotRequest = (req: Request) => {
  const expected = process.env.TELEGRAM_BOT_API_SECRET;
  const provided = req.headers[BOT_SECRET_HEADER];
  if (!expected || typeof provided !== 'string') return false; // fail closed
  return safeEqual(provided, expected);
};

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

const authenticateBot = async (req: Request) => {
  if (!isValidBotRequest(req)) {
    throw new AppError('Invalid bot credentials', 401);
  }

  const chatId = req.body?.chat_id;
  if (typeof chatId !== 'string' || !/^-?\d{1,20}$/.test(chatId)) {
    throw new AppError('Invalid chat_id', 400);
  }

  const member = await orm.public.Member.where({ chat_id: chatId }).first();
  if (!member || member.is_deleted === 1) {
    throw new AppError('Authentication required', 401);
  }

  req.member = member;
  req.user = { id: member.id, role: 'member', type: 'member' };
};

const authenticateJwt = async (req: Request) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken ?? req.cookies?.token;

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
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.headers[BOT_SECRET_HEADER] !== undefined) {
      console.log('Authenticating bot request...');
      await authenticateBot(req);
    } else {
      await authenticateJwt(req);
    }
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Invalid or expired token', 401));
  }
};