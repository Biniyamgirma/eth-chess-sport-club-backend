import { z } from 'zod';

const integerValue = z.union([z.string(), z.number()]).transform(Number);

export const membershipTierCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    price: z.number().int().nonnegative(),
    duration_days: z.number().int().positive().optional(),
  }),
});

export const membershipTierUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    price: z.number().int().nonnegative().optional(),
    duration_days: z.number().int().positive().nullable().optional(),
  }),
  params: z.object({ id: integerValue }),
});

export const invoiceCreateSchema = z.object({
  body: z.object({
    tier_id: integerValue,
    payment_method: z.string().min(1).optional(),
  }),
});

export const paymentProofSchema = z.object({
  body: z.object({
    payment_proof_url: z.string().url(),
    paid_in_amount: z.number().int().positive().optional(),
    payment_method: z.string().min(1).optional(),
  }),
  params: z.object({ id: integerValue }),
});

export const invoiceConfirmationSchema = z.object({
  params: z.object({ id: integerValue }),
});