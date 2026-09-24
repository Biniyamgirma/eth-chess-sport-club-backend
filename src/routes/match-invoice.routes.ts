import { Router } from 'express';

import { createMatchInvoice, updateMatchInvoiceStatus } from '../controllers/match-invoice.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireBillingAccess } from '../middlewares/billingAccess.js';
import { validate } from '../middlewares/validate.js';
import { matchInvoiceCreateSchema, matchInvoiceStatusSchema } from '../validators/match-invoice.validator.js';

const router = Router();

router.use(requireAuth, requireBillingAccess);
router.post('/', validate(matchInvoiceCreateSchema), createMatchInvoice);
router.patch('/:id/status', validate(matchInvoiceStatusSchema), updateMatchInvoiceStatus);

export default router;