import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const ensureVenue = async (venueId: number) => {
  const venue = await orm.public.Venue.where({ id: venueId }).first();
  if (!venue || venue.is_deleted === 1) {
    throw new AppError('Venue not found', 404);
  }
};

const ensureTable = async (tableId: number) => {
  const table = await orm.public.VenueTable.where({ id: tableId }).first();
  if (!table) {
    throw new AppError('Venue table not found', 404);
  }

  return table;
};

export const venueTableService = {
  async listTables(venueId: number) {
    await ensureVenue(venueId);
    return orm.public.VenueTable.where({ venue_id: venueId }).all();
  },

  async createTable(venueId: number, input: Record<string, any>, createdBy?: number) {
    await ensureVenue(venueId);

    return orm.public.VenueTable.create({
      venue_id: venueId,
      name: input.name ?? null,
      status: input.status ?? 1,
      created_by: createdBy ?? null,
      ideal_player: input.ideal_player ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async updateTable(tableId: number, input: Record<string, any>) {
    await ensureTable(tableId);

    return orm.public.VenueTable.where({ id: tableId }).update({
      ...(typeof input.name !== 'undefined' ? { name: input.name } : {}),
      ...(typeof input.status !== 'undefined' ? { status: input.status } : {}),
      ...(typeof input.ideal_player !== 'undefined' ? { ideal_player: input.ideal_player } : {}),
      updatedAt: new Date(),
    });
  },

  async deleteTable(tableId: number) {
    await ensureTable(tableId);
    return orm.public.VenueTable.where({ id: tableId }).delete();
  },

  async setTableStatus(tableId: number, status: number) {
    await ensureTable(tableId);
    return orm.public.VenueTable.where({ id: tableId }).update({
      status,
      updatedAt: new Date(),
    });
  },
};