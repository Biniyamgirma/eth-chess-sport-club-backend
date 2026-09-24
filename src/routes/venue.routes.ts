import { Router } from 'express';

import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { validate } from '../middlewares/validate.js';
import { getVenues, createVenue, updateVenue } from '../controllers/venue.controller.js';
import { venueCreateSchema } from '../validators/venue.validator.js';

const router = Router();

router.use(requireAuth);

router.get('/', getVenues);
router.post('/', requireAdminLevel(6), validate(venueCreateSchema), createVenue);
router.patch('/:id', requireAdminLevel(6), updateVenue);

export default router;
