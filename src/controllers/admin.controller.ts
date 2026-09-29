import type { NextFunction, Request, Response } from 'express';

import { adminService } from '../services/admin.service.js';

const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;

const setAdminCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sevenDaysInMilliseconds,
  });
};

export const loginAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.login(req.body.f_name, req.body.password);
    setAdminCookie(res, result.token);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: result.user },
    });
  } catch (error) {
    return next(error);
  }
};

export const registerAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = {
  ...req.body
};
    const admin = await adminService.register(payload);
    return res.status(201).json({ success: true, data: admin });
  } catch (error) {
    return next(error);
  }
};

export const updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = await adminService.updateAdmin(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: admin });
  } catch (error) {
    return next(error);
  }
};

export const createAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await adminService.createRole(req.body);
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await adminService.updateRole(Number(req.params.id), req.body);
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteRole(Number(req.params.id));
    return res.status(200).json({ success: true, message: 'Admin role deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
export const getAdminRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await adminService.getRoles();
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    return next(error);
  }
};