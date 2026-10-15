import { Router, type RequestHandler } from 'express';

import {
  adminVoteOnBrilliantMove,
  editBrilliantMoveSubmission,
  listAllBrilliantMoves,
  listBrilliantMoves,
  listBrilliantMovesForTelegram,
  listThisWeekBrilliantMoves,
  listWeeklyBrilliantMoveWinners,
  removeVoteOnBrilliantMove,
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
  brilliantMoveListQuerySchema,
  brilliantMoveParamsSchema,
  brilliantMoveSubmissionSchema,
  brilliantMoveVoteSchema,
  telegramBrilliantMoveIdSchema,
  telegramBrilliantMoveRequestSchema,
  telegramBrilliantMoveSubmissionSchema,
} from '../validators/brilliant-move.validator.js';

export const createBrilliantMoveRouter = (
  authenticate: RequestHandler = requireAuth,
) => {
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
  router.post(
    '/submit',
    authenticate,
    validate(brilliantMoveSubmissionSchema),
    submitBrilliantMove,
  );
  router.patch(
    '/:id',
    authenticate,
    validate(brilliantMoveSubmissionSchema),
    editBrilliantMoveSubmission,
  );
  router.get(
    '/this-week',
    authenticate,
    requireRole(['admin', 'member']),
    listThisWeekBrilliantMoves,
  );
  router.get(
    '/all',
    authenticate,
    requireRole(['admin', 'member']),
    validate(brilliantMoveListQuerySchema),
    listAllBrilliantMoves,
  );
  router.get(
    '/winners',
    authenticate,
    requireRole(['admin', 'member']),
    listWeeklyBrilliantMoveWinners,
  );
  router.get(
    '/',
    authenticate,
    requireRole(['admin', 'member']),
    listBrilliantMoves,
  );
  router.patch(
    '/:id/admin-vote',
    authenticate,
    requireRole(['admin']),
    validate(brilliantMoveVoteSchema),
    adminVoteOnBrilliantMove,
  );
  router.patch(
    '/:id/rank-and-award',
    authenticate,
    requireRole(['admin']),
    updateBrilliantMoveRankAndAward,
  );
  router.post(
    '/:id/vote',
    authenticate,
    requireRole(['admin', 'member']),
    validate(brilliantMoveParamsSchema),
    voteOnBrilliantMove,
  );
  router.delete(
    '/:id/vote',
    authenticate,
    requireRole(['admin', 'member']),
    validate(brilliantMoveParamsSchema),
    removeVoteOnBrilliantMove,
  );

  return router;
};

const router = createBrilliantMoveRouter();
export default router;
