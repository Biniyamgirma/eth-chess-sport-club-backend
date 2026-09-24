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

export const listBrilliantMoves = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await brilliantMoveService.listSubmissions();
    return res.status(200).json({ success: true, data: items });
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
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const vote = await brilliantMoveService.voteOnSubmission(
      String(req.user.id),
      Number(req.params.id),
      String(req.body.vote_type ?? 'upvote'),
    );

    return res.status(200).json({ success: true, data: vote });
  } catch (error) {
    return next(error);
  }
};
