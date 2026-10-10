import { z } from 'zod';

const venueParams = z.object({ venueId: z.coerce.number().int().positive() });
const matchParams = z.object({ id: z.coerce.number().int().positive() });
const invoiceParams = z.object({ id: z.coerce.number().int().positive() });
const tableParams = venueParams.extend({ tableId: z.coerce.number().int().positive() });
const chatId = z.union([
  z.string().regex(/^-?\d{1,20}$/),
  z.number().int().safe(),
]).transform(String);

export const ownerBotVenuesSchema = z.object({
  body: z.object({ chat_id: chatId }),
});

export const ownerBotVenueSchema = z.object({
  params: venueParams,
  body: z.object({ chat_id: chatId }),
});

export const ownerBotCreateTableSchema = z.object({
  params: venueParams,
  body: z.object({
    chat_id: chatId,
    name: z.string().trim().min(1).max(80),
  }),
});

export const ownerBotTableStatusSchema = z.object({
  params: tableParams,
  body: z.object({ chat_id: chatId }),
});

export const ownerBotCreateInvoiceSchema = z.object({
  params: venueParams,
  body: z.object({
    chat_id: chatId,
    member_id: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(5).optional(),
  }).refine((value) => !!value.member_id || !!value.phone, {
    message: 'member_id or phone is required',
    path: ['member_id'],
  }),
});

export const ownerBotInvoiceStatusSchema = z.object({
  params: invoiceParams,
  body: z.object({
    chat_id: chatId,
    status: z.enum(['paid', 'canceled']),
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
  body: z.object({
    chat_id: chatId,
    cancellation_reason: z.coerce.number().int().positive(),
  }),
});