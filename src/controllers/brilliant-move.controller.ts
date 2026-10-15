import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../middlewares/errorHandler.js';
import { brilliantMoveService } from '../services/brilliant-move.service.js';

export const submitBrilliantMove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const submission = await brilliantMoveService.submitBrilliantMove(String(req.user.id), req.body);
    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    return next(error);
  }
};

export const submitBrilliantMoveFromTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.member) {
      throw new AppError('Authentication required', 401);
    }

    const submission = await brilliantMoveService.submitBrilliantMove(
      req.member.id,
      { move_url: req.body.move_url },
    );
    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    return next(error);
  }
};

export const listBrilliantMovesForTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.member) {
      throw new AppError('Authentication required', 401);
    }

    const submissions = await brilliantMoveService.listCurrentWeekSubmissions({
      id: req.member.id,
      role: 'member',
    });
    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    return next(error);
  }
};

export const voteOnBrilliantMoveFromTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.member) {
      throw new AppError('Authentication required', 401);
    }

    const vote = await brilliantMoveService.voteOnSubmission(
      req.member.id,
      Number(req.params.id),
      'upvote',
    );
    return res.status(200).json({ success: true, data: vote });
  } catch (error) {
    return next(error);
  }
};

export const editBrilliantMoveSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const submission = await brilliantMoveService.editBrilliantMoveSubmission(
      String(req.user.id),
      Number(req.params.id),
      req.body,
    );

    return res.status(200).json({ success: true, data: submission });
  } catch (error) {
    return next(error);
  }
};

const getVoter = (req: Request) => ({
  id: String(req.user!.id),
  role: req.user!.role as 'admin' | 'member',
});

export const listBrilliantMoves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await brilliantMoveService.listSubmissions(getVoter(req));
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
};

export const listThisWeekBrilliantMoves = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const items = await brilliantMoveService.listCurrentWeekSubmissions(getVoter(req));
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
};

export const listAllBrilliantMoves = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.page_size ?? 12);
    const sort = req.query.sort === 'most_votes' ? 'most_votes' : 'newest';
    const result = await brilliantMoveService.listAllSubmissions(
      getVoter(req),
      page,
      pageSize,
      sort,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const listWeeklyBrilliantMoveWinners = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const winners = await brilliantMoveService.listWeeklyWinners(getVoter(req));
    return res.status(200).json({ success: true, data: winners });
  } catch (error) {
    return next(error);
  }
};

export const adminVoteOnBrilliantMove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const submission = await brilliantMoveService.adminVoteOnSubmission(
      Number(req.user.id),
      Number(req.params.id),
      Number(req.body.vote),
    );

    return res.status(200).json({ success: true, data: submission });
  } catch (error) {
    return next(error);
  }
};

export const updateBrilliantMoveRankAndAward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const submission = await brilliantMoveService.updateRankAndAward(
      Number(req.user.id),
      Number(req.params.id),
      req.body,
    );

    return res.status(200).json({ success: true, data: submission });
  } catch (error) {
    return next(error);
  }
};

export const voteOnBrilliantMove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vote = await brilliantMoveService.setVoteOnSubmission(
      getVoter(req),
      Number(req.params.id),
      true,
    );
    return res.status(200).json({ success: true, data: vote });
  } catch (error) {
    return next(error);
  }
};

export const removeVoteOnBrilliantMove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vote = await brilliantMoveService.setVoteOnSubmission(
      getVoter(req),
      Number(req.params.id),
      false,
    );
    return res.status(200).json({ success: true, data: vote });
  } catch (error) {
    return next(error);
  }
};
