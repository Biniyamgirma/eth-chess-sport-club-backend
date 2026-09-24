import type { NextFunction, Request, Response } from 'express';

import { vendorService } from '../services/vendor.service.js';

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    return res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    return next(error);
  }
};