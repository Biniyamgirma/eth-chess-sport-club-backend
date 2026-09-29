import { Router } from 'express';

import {
  createAdminRole,
  deleteAdminRole,
  getAdminRoles,
  loginAdmin,
  registerAdmin,
  updateAdmin,
  updateAdminRole,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { validate } from '../middlewares/validate.js';
import {
  adminLoginSchema,
  adminRegisterSchema,
  adminRoleIdSchema,
  adminUpdateSchema,
  adminRoleCreateSchema,
  adminRoleUpdateSchema,
} from '../validators/admin.validator.js';

const router = Router();
///requireAuth, requireAdminLevel(6),
router.post('/login', validate(adminLoginSchema), loginAdmin);
router.post('/register',requireAuth, requireAdminLevel(6),  validate(adminRegisterSchema), registerAdmin);
router.patch('/:id', requireAuth, requireAdminLevel(6), validate(adminRoleIdSchema.merge(adminUpdateSchema)), updateAdmin);
router.post('/roles',requireAuth, requireAdminLevel(6), validate(adminRoleCreateSchema), createAdminRole);
router.patch('/roles/:id', requireAuth, requireAdminLevel(6), validate(adminRoleIdSchema.merge(adminRoleUpdateSchema)), updateAdminRole);
router.delete('/roles/:id', requireAuth, requireAdminLevel(6), validate(adminRoleIdSchema), deleteAdminRole);
router.get('/roles',  getAdminRoles);
export default router;