import { Router } from 'express';

import {
  adminVoteOnBrilliantMove,
  editBrilliantMoveSubmission,
  listBrilliantMoves,
  submitBrilliantMove,
  updateBrilliantMoveRankAndAward,
  voteOnBrilliantMove,
} from '../controllers/brilliant-move.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  brilliantMoveSubmissionSchema,
  brilliantMoveVoteSchema,
} from '../validators/brilliant-move.validator.js';

const router = Router();

router.post('/submit', requireAuth, validate(brilliantMoveSubmissionSchema), submitBrilliantMove);
router.patch('/:id', requireAuth, validate(brilliantMoveSubmissionSchema), editBrilliantMoveSubmission);
router.get('/', requireAuth, listBrilliantMoves);
router.patch('/:id/admin-vote', requireAuth, requireRole(['admin']), validate(brilliantMoveVoteSchema), adminVoteOnBrilliantMove);
router.patch('/:id/rank-and-award', requireAuth, requireRole(['admin']), updateBrilliantMoveRankAndAward);
router.post('/:id/vote', requireAuth, validate(brilliantMoveVoteSchema), voteOnBrilliantMove);

export default router;
