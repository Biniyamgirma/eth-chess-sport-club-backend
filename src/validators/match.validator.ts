import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

const tableIdParam = z.object({
  tableId: z.coerce.number().int().positive(),
});

export const matchStartSchema = z.object({
  params: tableIdParam,
  body: z.object({
    pricing_method: z.string().optional(),
    status: z.string().optional(),
    chat_id: z.number().int().optional(),
    log_details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const matchEndSchema = z.object({
  params: idParam,
  body: z.object({
    loser_user_id: z.string().min(1),
  }),
});

export const matchConfirmLoserSchema = z.object({
  params: idParam,
});

export const telegramMatchWebhookSchema = z.object({
  body: z.object({}).passthrough(),
});

const telegramChatId = z.union([z.string().min(1), z.number().int()]).transform(String);

export const telegramBotJoinSchema = z.object({
  params: tableIdParam,
  body: z.object({ chat_id: telegramChatId }),
});

export const telegramBotMatchSchema = z.object({
  params: idParam,
  body: z.object({ chat_id: telegramChatId }),
});

export const telegramBotEndSchema = z.object({
  params: idParam,
  body: z.object({
    chat_id: telegramChatId,
    loser: z.enum(['self', 'opponent']),
  }),
});

export const telegramBotConfirmSchema = z.object({
  params: idParam,
  body: z.object({
    chat_id: telegramChatId,
    token: z.string().min(1),
  }),
});