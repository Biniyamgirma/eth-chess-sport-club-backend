import { z } from 'zod';

export const authLoginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1),
    password: z.string().min(8),
    role: z.enum(['admin', 'vendor', 'member']),
  }),
});

export const phoneLoginSchema = z.object({
  body: z.object({
    phone: z.string().min(1),
    password: z.string().min(8),
  }),
});

export const telegramLinkSchema = z.object({
  body: z.object({
    identifier: z.string().min(1),
    password: z.string().min(8),
    chatId: z.union([z.string().min(1), z.number().int()]).transform(String),
    telegramUsername: z.string().min(1).optional(),
  }),
});

export const authLogoutSchema = z.object({
  body: z.object({}).passthrough().optional(),
});
