import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { VENDOR_STATUS } from '../utils/vendor-status.js';

const orm = prisma.orm as any;

export const vendorService = {
  async listVendors() {
    const vendors = await orm.public.Vendor.all();
    return vendors.map((vendor: any) => {
      const { password: _password, ...safeVendor } = vendor;
      return safeVendor;
    });
  },

  async createVendor(input: Record<string, any>) {
    if (input.venue_id !== undefined && input.venue_id !== null) {
      const venue = await orm.public.Venue.where({ id: Number(input.venue_id) }).first();
      if (!venue || venue.is_deleted === 1) {
        throw new AppError('Venue not found', 404);
      }
    }
    const now = Temporal.Now.instant();
    const password = await hashPassword(String(input.password));

    const vendor = await orm.public.Vendor.create({
      f_name: input.f_name,
      l_name: input.l_name,
      venue_id: input.venue_id ?? null,
      password,
      role: input.role ?? null,
      phone_number: input.phone_number,
      email: input.email,
      telegram_username: input.telegram_username,
      whats_up_username: input.whats_up_username,
      status: VENDOR_STATUS.active,
      createdAt: now,
      updatedAt: now,
    });

    delete vendor.password;
    return vendor;
  },

  async updateVendor(vendorId: number, input: Record<string, any>) {
    return updateVendorRecord(vendorId, input, false);
  },

  async adminUpdateVendor(vendorId: number, input: Record<string, any>) {
    return updateVendorRecord(vendorId, input, true);
  },

  async setVendorBlocked(vendorId: number, isBlocked: boolean) {
    const vendor = await orm.public.Vendor.where({ id: vendorId }).first();
    if (!vendor) {
      throw new AppError('Venue owner not found', 404);
    }

    const updated = await orm.public.Vendor.where({ id: vendorId }).update({
      status: isBlocked ? VENDOR_STATUS.blocked : VENDOR_STATUS.active,
      updatedAt: Temporal.Now.instant(),
    });
    delete updated.password;
    return updated;
  },
};

const updateVendorRecord = async (
  vendorId: number,
  input: Record<string, any>,
  allowRoleUpdate: boolean,
) => {
  const vendor = await orm.public.Vendor.where({ id: vendorId }).first();
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  if (input.venue_id !== undefined && input.venue_id !== null) {
    const venue = await orm.public.Venue.where({ id: Number(input.venue_id) }).first();
    if (!venue || venue.is_deleted === 1) {
      throw new AppError('Venue not found', 404);
    }
  }

  const payload: Record<string, any> = {
    ...input,
    updatedAt: Temporal.Now.instant(),
  };

  if (input.password !== undefined) {
    payload.password = await hashPassword(String(input.password));
  }

  delete payload.id;
  delete payload.createdAt;
  delete payload.chat_id;

  if (!allowRoleUpdate) {
    delete payload.role;
  }

  const updatedVendor = await orm.public.Vendor.where({ id: vendorId }).update(payload);
  delete updatedVendor.password;
  return updatedVendor;
};