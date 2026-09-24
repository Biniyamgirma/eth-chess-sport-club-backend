import type { NextFunction, Request, Response } from 'express';

import { matchInvoiceService } from '../services/match-invoice.service.js';

export const createMatchInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await matchInvoiceService.createInvoice(req.body, {
      role: req.user!.role,
      id: req.user!.id,
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

export const updateMatchInvoiceStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await matchInvoiceService.updateStatus(Number(req.params.id), req.body.status, {
      role: req.user!.role,
      id: req.user!.id,
    });
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};