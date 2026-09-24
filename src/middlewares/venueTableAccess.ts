import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

const orm = prisma.orm as any;

const hasElevatedAdminAccess = async (req: Request) => {
  if (req.user?.role !== 'admin') {
    return false;
  }

  const admin = await orm.public.Admin.where({ id: Number(req.user.id) }).first();
  return Boolean(admin && Number(admin.role) > 6);
};

const findVenueId = async (req: Request) => {
  if (req.params.venueId) {
    return Number(req.params.venueId);
  }

  const table = await orm.public.VenueTable.where({ id: Number(req.params.id) }).first();
  if (!table) {
    throw new AppError('Venue table not found', 404);
  }

  return table.venue_id;
};

export const requireVenueTableAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (await hasElevatedAdminAccess(req)) {
      return next();
    }

    if (req.user?.role !== 'vendor') {
      throw new AppError('Forbidden: venue owner or elevated administrator access required', 403);
    }

    const venueId = await findVenueId(req);
    const venue = await orm.public.Venue.where({ id: venueId }).first();

    if (!venue || Number(venue.vendor_id) !== Number(req.user.id)) {
      throw new AppError('Forbidden: you do not own this venue', 403);
    }

    return next();
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError('Authorization failed', 403));
  }
};