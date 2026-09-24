import { Router } from 'express';

import {
  activateLookup,
  createLookup,
  deactivateLookup,
  listActiveLookups,
  updateLookup,
} from '../controllers/lookup.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { validate } from '../middlewares/validate.js';
import {
  lookupCreateSchema,
  lookupIdSchema,
  lookupTypeSchema,
  lookupUpdateSchema,
} from '../validators/lookup.validator.js';

const router = Router();

router.get('/:type/active', validate(lookupTypeSchema), listActiveLookups);
router.post(
  '/:type',
  requireAuth,
  requireAdminLevel(5),
  validate(lookupTypeSchema),
  validate(lookupCreateSchema),
  createLookup,
);
router.patch(
  '/:type/:id',
  requireAuth,
  requireAdminLevel(5),
  validate(lookupTypeSchema),
  validate(lookupUpdateSchema),
  updateLookup,
);
router.patch(
  '/:type/:id/activate',
  requireAuth,
  requireAdminLevel(5),
  validate(lookupTypeSchema),
  validate(lookupIdSchema),
  activateLookup,
);
router.patch(
  '/:type/:id/deactivate',
  requireAuth,
  requireAdminLevel(5),
  validate(lookupTypeSchema),
  validate(lookupIdSchema),
  deactivateLookup,
);

export default router;