import { Router } from 'express';

import {
	confirmLoser,
	confirmLoserForTelegram,
	getTelegramMatchAccount,
	joinMatchTableForTelegram,
	joinMatchTable,
	leaveMatchTable,
	leaveMatchTableForTelegram,
	listCurrentTelegramMatches,
	listMatchTables,
	listMatchVenues,
	listTelegramMatchTables,
	listTelegramMatchVenues,
	requestMatchEndForTelegram,
	requestMatchEnd,
	startMatchForTelegram,
	telegramMatchWebhook,
	unlinkTelegramAccount,
} from '../controllers/match.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import {
	requireLinkedTelegramMember,
	requireTelegramBot,
} from '../middlewares/telegramBotAuth.js';
import { validate } from '../middlewares/validate.js';
import {
	matchConfirmLoserSchema,
	matchEndSchema,
	matchStartSchema,
	telegramBotAccountSchema,
	telegramBotConfirmSchema,
	telegramBotEndSchema,
	telegramBotJoinSchema,
	telegramBotLeaveSchema,
	telegramBotMatchSchema,
	telegramBotVenueTablesSchema,
	leaveMatchTableSchema,
	telegramMatchWebhookSchema,
} from '../validators/match.validator.js';

const router = Router();

// router.post('/telegram/webhook', validate(telegramMatchWebhookSchema), telegramMatchWebhook);

router.use('/bot', requireTelegramBot);
router.get('/bot/account', (req, res, next) => {
  console.log('GET /bot/account called');
  next();
}, validate(telegramBotAccountSchema));
router.post('/bot/account', validate(telegramBotAccountSchema), getTelegramMatchAccount);
router.post('/bot/matches', validate(telegramBotAccountSchema), requireLinkedTelegramMember, listCurrentTelegramMatches);
router.post('/bot/unlink', validate(telegramBotAccountSchema), requireLinkedTelegramMember, unlinkTelegramAccount);
router.post('/bot/venues', validate(telegramBotAccountSchema), requireLinkedTelegramMember, listTelegramMatchVenues);
router.post('/bot/venues/:venueId/tables', validate(telegramBotVenueTablesSchema), requireLinkedTelegramMember, listTelegramMatchTables);
router.post('/bot/tables/:tableId/join', validate(telegramBotJoinSchema), requireLinkedTelegramMember, joinMatchTableForTelegram);
router.post('/bot/tables/:tableId/leave', validate(telegramBotLeaveSchema), requireLinkedTelegramMember, leaveMatchTableForTelegram);
router.post('/bot/:id/start', validate(telegramBotMatchSchema), requireLinkedTelegramMember, startMatchForTelegram);
router.post('/bot/:id/end', validate(telegramBotEndSchema), requireLinkedTelegramMember, requestMatchEndForTelegram);
router.post('/bot/:id/confirm-loser', validate(telegramBotConfirmSchema), requireLinkedTelegramMember, confirmLoserForTelegram);

// router.use(requireAuth, requireRole(['member']));

router.get('/venues', listMatchVenues);
router.get('/venues/:venueId/tables', listMatchTables);
router.post('/tables/:tableId/join', requireAuth, validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/start', requireAuth, validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/leave', requireAuth, validate(leaveMatchTableSchema), leaveMatchTable);
router.post('/:id/end', requireAuth, validate(matchEndSchema), requestMatchEnd);
router.post('/:id/confirm-loser', requireAuth, validate(matchConfirmLoserSchema), confirmLoser);

export default router;