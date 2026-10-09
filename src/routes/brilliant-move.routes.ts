import { Router } from 'express';

import {
  adminVoteOnBrilliantMove,
  editBrilliantMoveSubmission,
  listBrilliantMoves,
  listBrilliantMovesForTelegram,
  submitBrilliantMove,
  submitBrilliantMoveFromTelegram,
  updateBrilliantMoveRankAndAward,
  voteOnBrilliantMove,
  voteOnBrilliantMoveFromTelegram,
} from '../controllers/brilliant-move.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import {
  requireLinkedTelegramMember,
  requireTelegramBot,
} from '../middlewares/telegramBotAuth.js';
import { validate } from '../middlewares/validate.js';
import {
  brilliantMoveSubmissionSchema,
  brilliantMoveVoteSchema,
  telegramBrilliantMoveIdSchema,
  telegramBrilliantMoveRequestSchema,
  telegramBrilliantMoveSubmissionSchema,
} from '../validators/brilliant-move.validator.js';

const router = Router();

router.post(
  '/bot/submit',
  requireTelegramBot,
  validate(telegramBrilliantMoveSubmissionSchema),
  requireLinkedTelegramMember,
  submitBrilliantMoveFromTelegram,
);
router.post(
  '/bot/week',
  requireTelegramBot,
  validate(telegramBrilliantMoveRequestSchema),
  requireLinkedTelegramMember,
  listBrilliantMovesForTelegram,
);
router.post(
  '/bot/:id/vote',
  requireTelegramBot,
  validate(telegramBrilliantMoveIdSchema),
  requireLinkedTelegramMember,
  voteOnBrilliantMoveFromTelegram,
);
router.post('/submit', requireAuth, validate(brilliantMoveSubmissionSchema), submitBrilliantMove);
router.patch('/:id', requireAuth, validate(brilliantMoveSubmissionSchema), editBrilliantMoveSubmission);
router.get('/', requireAuth, listBrilliantMoves);
router.patch('/:id/admin-vote', requireAuth, requireRole(['admin']), validate(brilliantMoveVoteSchema), adminVoteOnBrilliantMove);
router.patch('/:id/rank-and-award', requireAuth, requireRole(['admin']), updateBrilliantMoveRankAndAward);
router.post('/:id/vote', requireAuth, validate(brilliantMoveVoteSchema), voteOnBrilliantMove);

export default router;
