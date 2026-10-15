import { Router } from 'express';

import { createVendor, listVendors, setVendorBlocked, updateCurrentVendor, updateVendor } from '../controllers/vendor.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
	adminVendorUpdateSchema,
	vendorCreateSchema,
	vendorUpdateSchema,
	vendorBlockSchema,
} from '../validators/venue.validator.js';

const router = Router();

router.get('/', requireAuth, requireAdminLevel(2), listVendors);
router.post('/', requireAuth, requireAdminLevel(2), validate(vendorCreateSchema), createVendor);
router.put('/me', requireAuth, requireRole(['vendor']), validate(vendorUpdateSchema), updateCurrentVendor);
router.patch('/:id/status', requireAuth, requireAdminLevel(2), validate(vendorBlockSchema), setVendorBlocked);
router.patch('/:id', requireAuth, requireAdminLevel(2), validate(adminVendorUpdateSchema), updateVendor);

export default router;