import type { NextFunction, Request, Response } from 'express';

import { subscriptionService } from '../services/subscription.service.js';

export const listMembershipTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeDeleted = req.user?.role === 'admin' && req.query.includeDeleted === 'true';
    const tiers = await subscriptionService.listTiers(includeDeleted);
    return res.status(200).json({ success: true, data: tiers });
  } catch (error) {
    return next(error);
  }
};

export const createMembershipTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = await subscriptionService.createTier(req.body);
    return res.status(201).json({ success: true, data: tier });
  } catch (error) {
    return next(error);
  }
};

export const updateMembershipTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = await subscriptionService.updateTier(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: tier });
  } catch (error) {
    return next(error);
  }
};

export const deleteMembershipTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = await subscriptionService.softDeleteTier(Number(req.params.id));
    return res.status(200).json({ success: true, data: tier });
  } catch (error) {
    return next(error);
  }
};

export const createMembershipInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await subscriptionService.createInvoice(
      String(req.user?.id),
      Number(req.body.tier_id),
      req.body.payment_method,
    );
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

export const submitPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await subscriptionService.submitPaymentProof(
      String(req.user?.id),
      Number(req.params.id),
      req.body,
    );
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

export const confirmMembershipPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await subscriptionService.confirmPayment(
      Number(req.user?.id),
      Number(req.params.id),
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};