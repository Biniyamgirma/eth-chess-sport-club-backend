import { Router } from 'express';

import {
	confirmLoser,
	confirmLoserForTelegram,
	getTelegramMatchAccount,
	joinMatchTableForTelegram,
	joinMatchTable,
	leaveMatchTable,
	leaveMatchTableForTelegram,
	listMatchTables,
	listMatchVenues,
	requestMatchEndForTelegram,
	requestMatchEnd,
	startMatchForTelegram,
	telegramMatchWebhook,
} from '../controllers/match.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { requireTelegramBot } from '../middlewares/telegramBotAuth.js';
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
	leaveMatchTableSchema,
	telegramMatchWebhookSchema,
} from '../validators/match.validator.js';

const router = Router();

router.post('/telegram/webhook', validate(telegramMatchWebhookSchema), telegramMatchWebhook);

router.use('/bot', requireTelegramBot);
router.post('/bot/account', validate(telegramBotAccountSchema), getTelegramMatchAccount);
router.get('/bot/venues', listMatchVenues);
router.get('/bot/venues/:venueId/tables', listMatchTables);
router.post('/bot/tables/:tableId/join', validate(telegramBotJoinSchema), joinMatchTableForTelegram);
router.post('/bot/tables/:tableId/leave', validate(telegramBotLeaveSchema), leaveMatchTableForTelegram);
router.post('/bot/:id/start', validate(telegramBotMatchSchema), startMatchForTelegram);
router.post('/bot/:id/end', validate(telegramBotEndSchema), requestMatchEndForTelegram);
router.post('/bot/:id/confirm-loser', validate(telegramBotConfirmSchema), confirmLoserForTelegram);

// router.use(requireAuth, requireRole(['member']));

router.get('/venues', listMatchVenues);
router.get('/venues/:venueId/tables', listMatchTables);
router.post('/tables/:tableId/join', requireAuth, validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/start', requireAuth, validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/leave', requireAuth, validate(leaveMatchTableSchema), leaveMatchTable);
router.post('/:id/end', requireAuth, validate(matchEndSchema), requestMatchEnd);
router.post('/:id/confirm-loser', requireAuth, validate(matchConfirmLoserSchema), confirmLoser);

export default router;