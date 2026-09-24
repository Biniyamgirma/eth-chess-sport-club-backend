import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';

const orm = prisma.orm as any;

export const getVenues = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await orm.public.Venue.all();
    return res.status(200).json({ success: true, data: venues });
  } catch (error) {
    return next(error);
  }
};

export const createVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const venue = await orm.public.Venue.create({
      name: payload.name,
      commission: Number(payload.commission ?? 0),
      can_change_price_per_min: payload.can_change_price_per_min ?? null,
      vendor_id: payload.vendor_id ? Number(payload.vendor_id) : null,
      address: payload.address ?? null,
      pricing_method: payload.pricing_method ?? null,
      responsible_person: payload.responsible_person ? Number(payload.responsible_person) : null,
      google_map_link: payload.google_map_link ?? null,
      district: payload.district ? Number(payload.district) : null,
      longtude: payload.longtude ?? null,
      latitude: payload.latitude ?? null,
      status: payload.status ?? 1,
      is_deleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({ success: true, data: venue });
  } catch (error) {
    return next(error);
  }
};

export const updateVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const venue = await orm.public.Venue.where({ id: Number(id) }).update({
      ...payload,
      updatedAt: new Date(),
    });

    return res.status(200).json({ success: true, data: venue });
  } catch (error) {
    return next(error);
  }
};
