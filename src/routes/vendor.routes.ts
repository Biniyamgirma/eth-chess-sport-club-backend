import { Router } from 'express';

import { createVendor } from '../controllers/vendor.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { validate } from '../middlewares/validate.js';
import { vendorCreateSchema } from '../validators/venue.validator.js';

const router = Router();

router.post('/', requireAuth, requireAdminLevel(6), validate(vendorCreateSchema), createVendor);

export default router;