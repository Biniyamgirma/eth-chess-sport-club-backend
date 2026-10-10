import { Router } from 'express';

import {
  activateOwnerBotTable,
  cancelOwnerBotMatch,
  createOwnerBotInvoice,
  createOwnerBotTable,
  deactivateOwnerBotTable,
  listOwnerBotCancellationReasons,
  listOwnerBotMatches,
  listOwnerBotTables,
  listOwnerBotVenues,
  startOwnerBotMatch,
  updateOwnerBotInvoiceStatus,
} from '../controllers/venue-owner-bot.controller.js';
import { requireTelegramBot } from '../middlewares/telegramBotAuth.js';
import { validate } from '../middlewares/validate.js';
import {
  ownerBotCancelMatchSchema,
  ownerBotCreateInvoiceSchema,
  ownerBotCreateTableSchema,
  ownerBotInvoiceStatusSchema,
  ownerBotManualMatchSchema,
  ownerBotTableStatusSchema,
  ownerBotVenueSchema,
  ownerBotVenuesSchema,
} from '../validators/venue-owner-bot.validator.js';

const router = Router();

router.use(requireTelegramBot);
router.post('/venues', validate(ownerBotVenuesSchema), listOwnerBotVenues);
router.post('/venues/:venueId/tables/list', validate(ownerBotVenueSchema), listOwnerBotTables);
router.post('/venues/:venueId/tables', validate(ownerBotCreateTableSchema), createOwnerBotTable);
router.patch(
  '/venues/:venueId/tables/:tableId/activate',
  validate(ownerBotTableStatusSchema),
  activateOwnerBotTable,
);
router.patch(
  '/venues/:venueId/tables/:tableId/deactivate',
  validate(ownerBotTableStatusSchema),
  deactivateOwnerBotTable,
);
router.post('/venues/:venueId/invoices', validate(ownerBotCreateInvoiceSchema), createOwnerBotInvoice);
router.patch('/invoices/:id/status', validate(ownerBotInvoiceStatusSchema), updateOwnerBotInvoiceStatus);
router.post('/venues/:venueId/matches', validate(ownerBotVenueSchema), listOwnerBotMatches);
router.post('/venues/:venueId/matches/manual', validate(ownerBotManualMatchSchema), startOwnerBotMatch);
router.post('/cancellation-reasons', validate(ownerBotVenuesSchema), listOwnerBotCancellationReasons);
router.post('/matches/:id/cancel', validate(ownerBotCancelMatchSchema), cancelOwnerBotMatch);

export default router;