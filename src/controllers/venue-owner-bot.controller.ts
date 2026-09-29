import type { NextFunction, Request, Response } from 'express';

import { venueOwnerBotService } from '../services/venue-owner-bot.service.js';

export const listOwnerBotVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await venueOwnerBotService.listVenues(String(req.query.chat_id));
    return res.status(200).json({ success: true, data: venues });
  } catch (error) {
    return next(error);
  }
};

export const listOwnerBotTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await venueOwnerBotService.listTables(
      String(req.query.chat_id),
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

export const listOwnerBotMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await venueOwnerBotService.listActiveMatches(
      String(req.query.chat_id),
      Number(req.params.venueId),
    );
    return res.status(200).json({ success: true, data: matches });
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
    const match = await venueOwnerBotService.cancelMatch(req.body.chat_id, Number(req.params.id));
    return res.status(200).json({ success: true, data: match });
  } catch (error) {
    return next(error);
  }
};