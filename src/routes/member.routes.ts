import { Router } from 'express';

import {
  adminUpdateMember,
  getCurrentMember,
  getMember,
  listMembers,
  registerMember,
  softDeleteMember,
  syncExternalAccounts,
  updateCurrentMember,
} from '../controllers/member.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  adminMemberUpdateSchema,
  memberRegisterSchema,
  memberSyncSchema,
  memberUpdateSchema,
} from '../validators/member.validator.js';

const router = Router();

router.post('/register', validate(memberRegisterSchema), registerMember);

router.get('/', requireAuth, requireRole(['admin']), listMembers);
router.get('/me', requireAuth, getCurrentMember);
router.put('/me', requireAuth, validate(memberUpdateSchema), updateCurrentMember);
router.patch('/me/link-accounts', requireAuth, validate(memberSyncSchema), syncExternalAccounts);
router.get('/:id', requireAuth, getMember);
router.patch('/:id', requireAuth, requireRole(['admin']), validate(adminMemberUpdateSchema), adminUpdateMember);
router.delete('/:id', requireAuth, requireRole(['admin']), softDeleteMember);

export default router;
