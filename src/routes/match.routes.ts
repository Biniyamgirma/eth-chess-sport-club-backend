import { Router } from 'express';

import {
	confirmLoser,
	joinMatchTable,
	listMatchTables,
	listMatchVenues,
	requestMatchEnd,
	telegramMatchWebhook,
} from '../controllers/match.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
	matchConfirmLoserSchema,
	matchEndSchema,
	matchStartSchema,
	telegramMatchWebhookSchema,
} from '../validators/match.validator.js';

const router = Router();

router.post('/telegram/webhook', validate(telegramMatchWebhookSchema), telegramMatchWebhook);

router.use(requireAuth, requireRole(['member']));

router.get('/venues', listMatchVenues);
router.get('/venues/:venueId/tables', listMatchTables);
router.post('/tables/:tableId/join', validate(matchStartSchema), joinMatchTable);
router.post('/tables/:tableId/start', validate(matchStartSchema), joinMatchTable);
router.post('/:id/end', validate(matchEndSchema), requestMatchEnd);
router.post('/:id/confirm-loser', validate(matchConfirmLoserSchema), confirmLoser);

export default router;