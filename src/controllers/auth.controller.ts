import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../middlewares/errorHandler.js';
import { authService } from '../services/auth.service.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password, role } = req.body as {
      identifier?: string;
      password?: string;
      role?: 'admin' | 'vendor' | 'member';
    };

    if (!identifier || !password || !role) {
      throw new AppError('Identifier, password, and role are required', 400);
    }

    const result = await authService.login({
      identifier,
      password,
      role,
    });

    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const phoneLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body as { phone: string; password: string };
    const result = await authService.login({
      identifier: phone,
      password,
      role: 'member',
    });

    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: result.user },
    });
  } catch (error) {
    return next(error);
  }
};

export const linkTelegramAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password, chatId, telegramUsername } = req.body as {
      identifier: string;
      password: string;
      chatId: string;
      telegramUsername?: string;
    };

    const member = await authService.linkTelegramAccount({
      identifier,
      password,
      chatId,
      ...(telegramUsername ? { telegramUsername } : {}),
    });

    return res.status(200).json({
      success: true,
      message: 'Telegram account linked successfully',
      data: { member },
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};
