import { Router } from 'express';

import {
  adminUpdateMember,
  getCurrentMember,
  getMember,
  getTelegramMemberProfile,
  linkTelegramChessComAccount,
  listMembers,
  registerMember,
  registerTelegramMember,
  softDeleteMember,
  syncExternalAccounts,
  updateCurrentMember,
} from '../controllers/member.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  requireLinkedTelegramMember,
  requireTelegramBot,
} from '../middlewares/telegramBotAuth.js';
import { validate } from '../middlewares/validate.js';
import {
  adminMemberUpdateSchema,
  memberRegisterSchema,
  memberSyncSchema,
  memberUpdateSchema,
  telegramChessComLinkSchema,
  telegramMemberProfileSchema,
  telegramMemberRegisterSchema,
} from '../validators/member.validator.js';

const router = Router();

router.post('/register', validate(memberRegisterSchema), registerMember);// works
router.post(
  '/bot/register',
  requireTelegramBot,
  validate(telegramMemberRegisterSchema),
  registerTelegramMember,
);
router.post(
  '/bot/profile',
  requireTelegramBot,
  validate(telegramMemberProfileSchema),
  requireLinkedTelegramMember,
  getTelegramMemberProfile,
);
router.post(
  '/bot/link-chesscom',
  requireTelegramBot,
  validate(telegramChessComLinkSchema),
  requireLinkedTelegramMember,
  linkTelegramChessComAccount,
);

router.get('/', requireAuth, requireRole(['admin']), listMembers);// works
router.get('/me', requireAuth, getCurrentMember);
router.put('/me', requireAuth, validate(memberUpdateSchema), updateCurrentMember);
router.patch('/me/link-accounts', requireAuth, validate(memberSyncSchema), syncExternalAccounts);
router.get('/:id', requireAuth, getMember);
router.patch('/:id', requireAuth, requireRole(['admin']), validate(adminMemberUpdateSchema), adminUpdateMember);
router.delete('/:id', requireAuth, requireRole(['admin']), softDeleteMember);

export default router;
