import { Router } from 'express';

import { createVendor, updateCurrentVendor, updateVendor } from '../controllers/vendor.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
	adminVendorUpdateSchema,
	vendorCreateSchema,
	vendorUpdateSchema,
} from '../validators/venue.validator.js';

const router = Router();

router.post('/', requireAuth, requireAdminLevel(6), validate(vendorCreateSchema), createVendor);
router.put('/me', requireAuth, requireRole(['vendor']), validate(vendorUpdateSchema), updateCurrentVendor);
router.patch('/:id', requireAuth, requireAdminLevel(6), validate(adminVendorUpdateSchema), updateVendor);

export default router;