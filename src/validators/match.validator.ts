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
    color: z.enum(['white', 'black']).optional(),
  }).strict(),
});

export const leaveMatchTableSchema = z.object({
  params: tableIdParam,
  body: z.object({}).strict(),
});

export const matchEndSchema = z.object({
  params: idParam,
  body: z.object({
    loser_user_id: z.string().min(1),
  }).strict(),
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
  body: z.object({
    chat_id: telegramChatId,
    color: z.enum(['white', 'black']).optional(),
  }).strict(),
});

export const telegramBotAccountSchema = z.object({
  body: z.object({ chat_id: telegramChatId }).strict(),
});

export const telegramBotLeaveSchema = z.object({
  params: tableIdParam,
  body: z.object({ chat_id: telegramChatId }).strict(),
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
  }).strict(),
});

export const telegramBotConfirmSchema = z.object({
  params: idParam,
  body: z.object({
    chat_id: telegramChatId,
    token: z.string().min(1),
  }).strict(),
});