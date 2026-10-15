import { z } from 'zod';

const optionalInteger = z.union([z.string(), z.number()]).transform(Number).optional();

export const venueCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    commission: z.number().int(),
    can_change_price_per_min: optionalInteger,
    vendor_id: optionalInteger,
    address: z.string().optional(),
    pricing_method: z.string().optional(),
    responsible_person: optionalInteger,
    google_map_link: z.string().url().optional(),
    district: optionalInteger,
    longtude: z.string().optional(),
    latitude: z.string().optional(),
    status: z.number().int().optional(),
  }),
});

export const vendorCreateSchema = z.object({
  body: z.object({
    f_name: z.string().trim().min(1),
    l_name: z.string().trim().min(1),
    venue_id: optionalInteger,
    password: z.string().min(8).max(128),
    phone_number: z.string().trim().min(5),
    email: z.string().trim().email(),
    telegram_username: z.string().trim().min(2),
    whats_up_username: z.string().trim().min(2),
  }),
});

export const vendorUpdateSchema = z.object({
  body: z.object({
    f_name: z.string().min(1).optional(),
    l_name: z.string().optional(),
    venue_id: optionalInteger,
    password: z.string().min(8).optional(),
    phone_number: z.string().min(5).optional(),
    email: z.string().email().optional(),
    telegram_username: z.string().optional(),
    whats_up_username: z.string().optional(),
  }),
});

export const adminVendorUpdateSchema = z.object({
  body: z.object({
    f_name: z.string().min(1).optional(),
    l_name: z.string().optional(),
    venue_id: optionalInteger,
    password: z.string().min(8).optional(),
    phone_number: z.string().min(5).optional(),
    email: z.string().email().optional(),
    telegram_username: z.string().optional(),
    whats_up_username: z.string().optional(),
  }),
});

export const vendorBlockSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ is_blocked: z.boolean() }).strict(),
});