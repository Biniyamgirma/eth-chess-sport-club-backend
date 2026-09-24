import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const lookupTypeSchema = z.object({
  params: z.object({
    type: z.enum(['district', 'cancellationReason']),
  }),
});

const nameBody = z.object({
  name: z.string().min(1).optional(),
});

export const lookupCreateSchema = z.object({
  body: nameBody,
});

export const lookupUpdateSchema = z.object({
  params: idParam,
  body: nameBody,
});

export const lookupIdSchema = z.object({
  params: idParam,
});