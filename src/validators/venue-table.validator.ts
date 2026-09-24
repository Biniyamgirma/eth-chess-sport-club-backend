import { z } from 'zod';

const integerValue = z.union([z.string(), z.number()]).transform(Number);

export const venueTableCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.number().int().optional(),
    ideal_player: z.string().optional(),
  }),
  params: z.object({
    venueId: integerValue,
  }),
});

export const venueTableUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.number().int().optional(),
    ideal_player: z.string().optional(),
  }),
  params: z.object({
    id: integerValue,
  }),
});