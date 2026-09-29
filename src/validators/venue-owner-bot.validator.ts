import { z } from 'zod';

const venueParams = z.object({ venueId: z.coerce.number().int().positive() });
const matchParams = z.object({ id: z.coerce.number().int().positive() });
const chatId = z.union([z.string().min(1), z.number().int()]).transform(String);

export const ownerBotVenuesSchema = z.object({
  query: z.object({ chat_id: z.string().min(1) }),
});

export const ownerBotVenueSchema = z.object({
  params: venueParams,
  query: z.object({ chat_id: z.string().min(1) }),
});

export const ownerBotCreateTableSchema = z.object({
  params: venueParams,
  body: z.object({
    chat_id: chatId,
    name: z.string().trim().min(1).max(80),
  }),
});

export const ownerBotManualMatchSchema = z.object({
  params: venueParams,
  body: z.object({
    chat_id: chatId,
    table_id: z.coerce.number().int().positive(),
    player_one: z.string().trim().min(1),
    player_two: z.string().trim().min(1),
  }),
});

export const ownerBotCancelMatchSchema = z.object({
  params: matchParams,
  body: z.object({ chat_id: chatId }),
});