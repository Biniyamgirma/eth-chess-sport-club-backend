import type { NextFunction, Request, Response } from 'express';

import { venueTableService } from '../services/venue-table.service.js';

export const listVenueTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await venueTableService.listTables(Number(req.params.venueId));
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return next(error);
  }
};

export const createVenueTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await venueTableService.createTable(
      Number(req.params.venueId),
      req.body,
      req.user?.role === 'admin' ? Number(req.user.id) : undefined,
    );
    return res.status(201).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};

export const updateVenueTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await venueTableService.updateTable(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};

export const deleteVenueTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await venueTableService.deleteTable(Number(req.params.id));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const activateVenueTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await venueTableService.setTableStatus(Number(req.params.id), 1);
    return res.status(200).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};

export const deactivateVenueTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await venueTableService.setTableStatus(Number(req.params.id), 0);
    return res.status(200).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};