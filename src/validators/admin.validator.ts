import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    f_name: z.string().trim().min(1),
    password: z.string().min(8),
  }),
});

export const adminRegisterSchema = z.object({
  body: z.object({
    f_name: z.string().trim().min(1),
    l_name: z.string().trim().min(1).optional(),
    password: z.string().min(8),
    role: z.coerce.number().int().positive(),
  }),
});

export const adminRoleCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    status: z.string().optional(),
  }),
});

export const adminRoleIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const adminUpdateSchema = z.object({
  body: z.object({
    f_name: z.string().trim().min(1).optional(),
    l_name: z.string().trim().min(1).nullable().optional(),
    password: z.string().min(8).optional(),
    status: z.number().int().nullable().optional(),
    role: z.coerce.number().int().positive().optional(),
  }).refine((body) => Object.values(body).some((value) => value !== undefined)),
});

export const adminRoleUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    status: z.string().optional(),
  }).refine((body) => body.name !== undefined || body.status !== undefined),
});