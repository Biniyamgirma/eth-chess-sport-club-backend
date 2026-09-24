import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { signToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

const orm = prisma.orm as any;

export const authService = {
  async login(payload: { identifier: string; password: string; role: 'admin' | 'vendor' | 'member' }) {
    try {
      let user: any = null;

      if (payload.role === 'admin') {
        user = await orm.public.Admin.where({ id: Number(payload.identifier) }).first();
      }

      if (payload.role === 'vendor') {
        user = await orm.public.Vendor.where({ email: payload.identifier }).first();
      }

      if (payload.role === 'member') {
        user = await orm.public.Member.where({ phone: payload.identifier }).first();
      }

      if (!user || !user.password) {
        throw new AppError('Invalid credentials', 401);
      }

      const isValidPassword = await comparePassword(payload.password, user.password);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      const token = signToken({
        sub: `${payload.role}:${user.id}`,
        role: payload.role,
        userId: user.id,
      });

      return {
        token,
        user: {
          id: user.id,
          role: payload.role,
          identifier: payload.identifier,
          name: user.f_name ?? user.name ?? user.phone ?? 'User',
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Authentication failed', 401);
    }
  },

  async linkTelegramAccount(payload: {
    identifier: string;
    password: string;
    chatId: string;
    telegramUsername?: string;
  }) {
    const member =
      (await orm.public.Member.where({ id: payload.identifier }).first()) ??
      (await orm.public.Member.where({ phone: payload.identifier }).first()) ??
      (await orm.public.Member.where({ telegram_username: payload.identifier }).first());

    if (!member || member.is_deleted === 1 || !member.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await comparePassword(payload.password, member.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const linkedMember = await orm.public.Member.where({ chat_id: payload.chatId }).first();
    if (linkedMember && linkedMember.id !== member.id) {
      throw new AppError('This Telegram account is already linked', 409);
    }

    const updatedMember = await orm.public.Member.where({ id: member.id }).update({
      chat_id: payload.chatId,
      telegram_username: payload.telegramUsername ?? member.telegram_username ?? null,
      updatedAt: new Date(),
    });

    return {
      id: updatedMember.id,
      name: updatedMember.f_name ?? updatedMember.phone ?? 'User',
      chatId: updatedMember.chat_id,
    };
  },

  async registerUser(payload: { role: 'admin' | 'vendor' | 'member'; password: string; data: Record<string, unknown> }) {
    const hashedPassword = await hashPassword(payload.password);

    if (payload.role === 'admin') {
      return orm.public.Admin.create({
        ...payload.data,
        password: hashedPassword,
      });
    }

    if (payload.role === 'vendor') {
      return orm.public.Vendor.create({
        ...payload.data,
        password: hashedPassword,
      });
    }

    return orm.public.Member.create({
      ...payload.data,
      password: hashedPassword,
    });
  },
};
