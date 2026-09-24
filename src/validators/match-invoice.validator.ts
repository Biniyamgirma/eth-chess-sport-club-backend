import { z } from 'zod';

export const matchInvoiceCreateSchema = z.object({
  body: z.object({
    member_id: z.string().min(1).optional(),
    phone: z.string().min(5).optional(),
    venue_id: z.coerce.number().int().positive().optional(),
  }).refine((value) => !!value.member_id || !!value.phone, {
    message: 'member_id or phone is required',
    path: ['member_id'],
  }),
});

export const matchInvoiceStatusSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ status: z.enum(['paid', 'canceled']) }),
});