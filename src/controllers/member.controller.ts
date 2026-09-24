import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../middlewares/errorHandler.js';
import { memberService } from '../services/member.service.js';

export const registerMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await memberService.registerMember(req.body);
    return res.status(201).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};

export const listMembers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await memberService.listMembers();
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return next(error);
  }
};

export const getMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await memberService.getMemberById(String(req.params.id));
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const member = await memberService.getMemberById(String(req.user.id));
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};

export const updateCurrentMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const member = await memberService.updateMemberProfile(String(req.user.id), req.body);
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};

export const adminUpdateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await memberService.adminUpdateMember(String(req.params.id), req.body);
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};

export const softDeleteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await memberService.softDeleteMember(String(req.params.id));
    return res.status(200).json({ success: true, data: result, message: 'Member soft deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

export const syncExternalAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const member = await memberService.syncExternalProfiles(String(req.user.id), req.body);
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return next(error);
  }
};
