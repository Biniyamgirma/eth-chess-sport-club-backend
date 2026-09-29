import { Router } from 'express';

import {
  cancelOwnerBotMatch,
  createOwnerBotTable,
  listOwnerBotMatches,
  listOwnerBotTables,
  listOwnerBotVenues,
  startOwnerBotMatch,
} from '../controllers/venue-owner-bot.controller.js';
import { requireTelegramBot } from '../middlewares/telegramBotAuth.js';
import { validate } from '../middlewares/validate.js';
import {
  ownerBotCancelMatchSchema,
  ownerBotCreateTableSchema,
  ownerBotManualMatchSchema,
  ownerBotVenueSchema,
  ownerBotVenuesSchema,
} from '../validators/venue-owner-bot.validator.js';

const router = Router();

router.use(requireTelegramBot);
router.get('/venues', validate(ownerBotVenuesSchema), listOwnerBotVenues);
router.get('/venues/:venueId/tables', validate(ownerBotVenueSchema), listOwnerBotTables);
router.post('/venues/:venueId/tables', validate(ownerBotCreateTableSchema), createOwnerBotTable);
router.get('/venues/:venueId/matches', validate(ownerBotVenueSchema), listOwnerBotMatches);
router.post('/venues/:venueId/matches/manual', validate(ownerBotManualMatchSchema), startOwnerBotMatch);
router.post('/matches/:id/cancel', validate(ownerBotCancelMatchSchema), cancelOwnerBotMatch);

export default router;