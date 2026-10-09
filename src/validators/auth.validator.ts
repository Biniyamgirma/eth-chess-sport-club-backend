import { z } from 'zod';

const telegramChatId = z.string().regex(/^-?\d{1,20}$/);

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
    phone: z.string().min(5).optional(),
    identifier: z.string().min(1).optional(),
    password: z.string().min(8),
    chatId: telegramChatId,
    telegramUsername: z.string().min(1).optional(),
  }).refine(({ phone, identifier }) => Boolean(phone) !== Boolean(identifier), {
    message: 'Provide either a phone number or identifier',
  }),
});

export const telegramVendorLinkSchema = z.object({
  body: z.object({
    phone: z.string().min(5),
    password: z.string().min(8),
    chatId: z.union([z.string().min(1), z.number().int()]).transform(String),
    telegramUsername: z.string().min(1).optional(),
  }),
});

export const authLogoutSchema = z.object({
  body: z.object({}).passthrough().optional(),
});
