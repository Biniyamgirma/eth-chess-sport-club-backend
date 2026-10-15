import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../middlewares/errorHandler.js';
import { vendorService } from '../services/vendor.service.js';

export const listVendors = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await vendorService.listVendors();
    return res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    return next(error);
  }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    return res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    return next(error);
  }
};

export const updateCurrentVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const vendor = await vendorService.updateVendor(Number(req.user.id), req.body);
    return res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    return next(error);
  }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.adminUpdateVendor(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    return next(error);
  }
};

export const setVendorBlocked = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.setVendorBlocked(
      Number(req.params.id),
      req.body.is_blocked,
    );
    return res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    return next(error);
  }
};