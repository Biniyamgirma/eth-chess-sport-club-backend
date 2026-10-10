import type { NextFunction, Request, Response } from 'express';

import { venueOwnerBotService } from '../services/venue-owner-bot.service.js';

export const listOwnerBotVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await venueOwnerBotService.listVenues(req.body.chat_id);
    return res.status(200).json({ success: true, data: venues });
  } catch (error) {
    return next(error);
  }
};

export const listOwnerBotTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await venueOwnerBotService.listTables(
      req.body.chat_id,
      Number(req.params.venueId),
    );
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return next(error);
  }
};

export const createOwnerBotTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await venueOwnerBotService.createTable(
      req.body.chat_id,
      Number(req.params.venueId),
      req.body.name,
    );
    return res.status(201).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};

const setOwnerBotTableStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
  status: 0 | 1,
) => {
  try {
    const table = await venueOwnerBotService.setTableStatus(
      req.body.chat_id,
      Number(req.params.venueId),
      Number(req.params.tableId),
      status,
    );
    return res.status(200).json({ success: true, data: table });
  } catch (error) {
    return next(error);
  }
};

export const activateOwnerBotTable = (req: Request, res: Response, next: NextFunction) =>
  setOwnerBotTableStatus(req, res, next, 1);

export const deactivateOwnerBotTable = (req: Request, res: Response, next: NextFunction) =>
  setOwnerBotTableStatus(req, res, next, 0);

export const createOwnerBotInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await venueOwnerBotService.createInvoice(
      req.body.chat_id,
      Number(req.params.venueId),
      { member_id: req.body.member_id, phone: req.body.phone },
    );
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

export const updateOwnerBotInvoiceStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await venueOwnerBotService.updateInvoiceStatus(
      req.body.chat_id,
      Number(req.params.id),
      req.body.status,
    );
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

export const listOwnerBotMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await venueOwnerBotService.listActiveMatches(
      req.body.chat_id,
      Number(req.params.venueId),
    );
    return res.status(200).json({ success: true, data: matches });
  } catch (error) {
    return next(error);
  }
};

export const listOwnerBotCancellationReasons = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reasons = await venueOwnerBotService.listActiveCancellationReasons(req.body.chat_id);
    return res.status(200).json({ success: true, data: reasons });
  } catch (error) {
    return next(error);
  }
};

export const startOwnerBotMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await venueOwnerBotService.startManualMatch(
      req.body.chat_id,
      Number(req.params.venueId),
      req.body.table_id,
      req.body.player_one,
      req.body.player_two,
    );
    return res.status(201).json({ success: true, data: match });
  } catch (error) {
    return next(error);
  }
};

export const cancelOwnerBotMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await venueOwnerBotService.cancelMatch(
      req.body.chat_id,
      Number(req.params.id),
      req.body.cancellation_reason,
    );
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    return next(error);
  }
};