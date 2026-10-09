import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

const orm = prisma.orm as any;

export const requireTelegramBot = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const expected = env.TELEGRAM_BOT_API_SECRET?.trim();
  const supplied = req.header('x-ethchess-bot-secret');
  if (!expected) {
    return next(new AppError('Telegram bot API is not configured', 503));
  }

  if (!supplied) {
    return next(new AppError('Telegram bot authentication required', 401));
  }

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return next(new AppError('Invalid Telegram bot credentials', 401));
  }

  return next();
};

export const requireLinkedTelegramMember = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const chatId = req.body?.chat_id;
  if (typeof chatId !== 'string' || !/^-?\d{1,20}$/.test(chatId)) {
    return next(new AppError('Invalid chat_id', 400));
  }

  try {
    console.log('requireLinkedTelegramMember: looking for member with chat_id', chatId);
    const member = await orm.public.Member.where({ chat_id: chatId }).first();
    console.log('requireLinkedTelegramMember: found member', member);
    if (!member || member.is_deleted === 1) {
      return next(new AppError('Authentication required 001', 401));
    }

    req.member = member;
    return next();
  } catch (error) {
    return next(error);
  }
};