import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../middlewares/errorHandler.js';
import { memberService } from '../services/member.service.js';

function formatAddisTime(value: unknown): string | null {
  if (!value) return null;

  // Normalize to a Temporal.Instant regardless of what the ORM returned
  const instant =
    value instanceof Temporal.Instant
      ? value
      : Temporal.Instant.from(String(value));

  const zoned = instant.toZonedDateTimeISO('Africa/Addis_Ababa');

  // Manual format, e.g. "2026-09-28 16:42:29"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)} ${pad(zoned.hour)}:${pad(zoned.minute)}:${pad(zoned.second)}`;
}

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

    const formattedMembers = [];
    for (const member of members) {
      const { password, ...rest } = member; // strip sensitive field
      formattedMembers.push({
        ...rest,
        createdAt: formatAddisTime(member.createdAt),
        updatedAt: formatAddisTime(member.updatedAt),
      });
    }

    return res.status(200).json({ success: true, data: formattedMembers });
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
