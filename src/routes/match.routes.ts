import { Router } from 'express';

import {
	confirmLoser,
	confirmLoserForTelegram,
	joinMatchTableForTelegram,
	joinMatchTable,
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
	telegramBotConfirmSchema,
	telegramBotEndSchema,
	telegramBotJoinSchema,
	telegramBotMatchSchema,
	telegramMatchWebhookSchema,
} from '../validators/match.validator.js';

const router = Router();

router.post('/telegram/webhook', validate(telegramMatchWebhookSchema), telegramMatchWebhook);

router.use('/bot', requireTelegramBot);
router.get('/bot/venues', listMatchVenues);
router.get('/bot/venues/:venueId/tables', listMatchTables);
router.post('/bot/tables/:tableId/join', validate(telegramBotJoinSchema), joinMatchTableForTelegram);
router.post('/bot/:id/start', validate(telegramBotMatchSchema), startMatchForTelegram);
router.post('/bot/:id/end', validate(telegramBotEndSchema), requestMatchEndForTelegram);
router.post('/bot/:id/confirm-loser', validate(telegramBotConfirmSchema), confirmLoserForTelegram);

router.use(requireAuth, requireRole(['member']));

router.get('/venues', listMatchVenues);
router.get('/venues/:venueId/tables', listMatchTables);
router.post('/tables/:tableId/join', validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/start', validate(matchStartSchema), joinMatchTable);
router.post('/:id/end', validate(matchEndSchema), requestMatchEnd);
router.post('/:id/confirm-loser', validate(matchConfirmLoserSchema), confirmLoser);

export default router;