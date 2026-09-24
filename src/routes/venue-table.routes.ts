import { Router } from 'express';

import {
  activateVenueTable,
  createVenueTable,
  deactivateVenueTable,
  deleteVenueTable,
  listVenueTables,
  updateVenueTable,
} from '../controllers/venue-table.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireVenueTableAccess } from '../middlewares/venueTableAccess.js';
import { validate } from '../middlewares/validate.js';
import {
  venueTableCreateSchema,
  venueTableUpdateSchema,
} from '../validators/venue-table.validator.js';

const router = Router();

router.use(requireAuth);

router.get('/venues/:venueId/tables', requireVenueTableAccess, listVenueTables);
router.post(
  '/venues/:venueId/tables',
  requireVenueTableAccess,
  validate(venueTableCreateSchema),
  createVenueTable,
);
router.patch(
  '/venue-tables/:id',
  requireVenueTableAccess,
  validate(venueTableUpdateSchema),
  updateVenueTable,
);
router.delete('/venue-tables/:id', requireVenueTableAccess, deleteVenueTable);
router.patch('/venue-tables/:id/activate', requireVenueTableAccess, activateVenueTable);
router.patch('/venue-tables/:id/deactivate', requireVenueTableAccess, deactivateVenueTable);

export default router;