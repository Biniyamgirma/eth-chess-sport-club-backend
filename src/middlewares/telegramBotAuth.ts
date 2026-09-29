import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const requireTelegramBot = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const expected = env.TELEGRAM_BOT_API_SECRET;
  const supplied = req.header('x-ethchess-bot-secret');

  if (!expected) {
    return next(new AppError('Telegram bot API is not configured', 503));
  }

  if (!supplied) {
    return next(new AppError('Telegram bot authentication required', 401));
  }

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return next(new AppError('Invalid Telegram bot credentials', 401));
  }

  return next();
};