import type { NextFunction, Request, Response } from 'express';

import { lookupService } from '../services/lookup.service.js';

const lookupType = (req: Request) => req.params.type as 'district' | 'cancellationReason';

export const listActiveLookups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await lookupService.listActive(lookupType(req));
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return next(error);
  }
};

export const createLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await lookupService.create(lookupType(req), req.body.name);
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    return next(error);
  }
};

export const updateLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await lookupService.update(lookupType(req), Number(req.params.id), req.body.name);
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return next(error);
  }
};

export const activateLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await lookupService.setActive(lookupType(req), Number(req.params.id), true);
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return next(error);
  }
};

export const deactivateLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await lookupService.setActive(lookupType(req), Number(req.params.id), false);
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return next(error);
  }
};