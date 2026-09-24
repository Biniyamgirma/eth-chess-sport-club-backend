import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashPassword } from '../utils/password.js';

const orm = prisma.orm as any;

export const vendorService = {
  async createVendor(input: Record<string, any>) {
    if (input.venue_id !== undefined && input.venue_id !== null) {
      const venue = await orm.public.Venue.where({ id: Number(input.venue_id) }).first();
      if (!venue || venue.is_deleted === 1) {
        throw new AppError('Venue not found', 404);
      }
    }

    const password = await hashPassword(String(input.password));

    const vendor = await orm.public.Vendor.create({
      f_name: input.f_name ?? null,
      l_name: input.l_name ?? null,
      venue_id: input.venue_id ?? null,
      password,
      role: input.role ?? null,
      phone_number: input.phone_number ?? null,
      email: input.email ?? null,
      telegram_username: input.telegram_username ?? null,
      whats_up_username: input.whats_up_username ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    delete vendor.password;
    return vendor;
  },
};