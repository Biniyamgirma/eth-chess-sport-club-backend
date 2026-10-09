import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { matchService } from '../services/match.service.js';
import { memberService } from '../services/member.service.js';

export const listMatchVenues = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await matchService.listAvailableVenues();
    return res.status(200).json({ success: true, data: venues });
  } catch (error) {
    return next(error);
  }
};

export const listTelegramMatchVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await matchService.listAvailableVenues();
    return res.status(200).json({ success: true, data: venues });
  } catch (error) {
    return next(error);
  }
};

export const getTelegramMatchAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('getTelegramMatchAccount called with chat_id:', req.body.chat_id);
    const member = await matchService.getMemberByChatId(req.body.chat_id);
    if (!member) {
      return res.status(200).json({ success: true, data: { linked: false } });
    }

    return res.status(200).json({
      success: true,
      data: {
        linked: true,
        member: {
          id: member.id,
          name: `${member.f_name ?? ''} ${member.l_name ?? ''}`.trim(),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const listCurrentTelegramMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await matchService.listCurrentMatchesForTelegram(req.member!.id);
    return res.status(200).json({ success: true, data: matches });
  } catch (error) {
    return next(error);
  }
};

export const listMatchTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await matchService.listAvailableTables(Number(req.params.venueId));
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return next(error);
  }
};

export const listTelegramMatchTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await matchService.listAvailableTables(Number(req.params.venueId), true);
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return next(error);
  }
};

export const joinMatchTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.joinTable(String(req.user?.id), Number(req.params.tableId), req.body);
    return res.status(result.state === 'match_started' ? 201 : 200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const leaveMatchTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.leaveWaitingTable(
      String(req.user?.id),
      Number(req.params.tableId),
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const requestMatchEnd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.requestMatchEnd(
      String(req.user?.id),
      Number(req.params.id),
      req.body.loser_user_id,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const confirmLoser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.confirmLoser(String(req.user?.id), Number(req.params.id));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const telegramMatchWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (env.TELEGRAM_WEBHOOK_SECRET &&
        req.headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new AppError('Invalid Telegram webhook secret', 401);
    }

    const callbackQuery = req.body.callback_query;
    const data = callbackQuery?.data as string | undefined;
    const chatId = callbackQuery?.message?.chat?.id;
    const match = data?.match(/^match:loser:(\d+):([a-f0-9-]+)$/i);

    if (!match || typeof chatId === 'undefined') {
      return res.status(200).json({ success: true });
    }

    const result = await matchService.handleTelegramCallback(Number(match[1]), match[2]!, String(chatId));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const joinMatchTableForTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.joinTableForTelegram(
      req.member!.id,
      Number(req.params.tableId),
      req.body.color,
    );
    return res.status(result.state === 'match_started' ? 201 : 200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const leaveMatchTableForTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.leaveWaitingTableForTelegram(
      req.member!.id,
      Number(req.params.tableId),
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const startMatchForTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.startMatchForTelegram(req.member!.id, Number(req.params.id));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const requestMatchEndForTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.requestMatchEndForTelegram(
      req.member!.id,
      Number(req.params.id),
      req.body.loser,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const confirmLoserForTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchService.confirmLoserForTelegram(
      req.member!.id,
      Number(req.params.id),
      req.body.token,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const unlinkTelegramAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await matchService.unlinkTelegramAccount(req.member!.id, req.member!.phone);
    return res.status(200).json({ success: true, data: { linked: false } });
  } catch (error) {
    return next(error);
  }
};