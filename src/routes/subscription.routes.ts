import { Router } from 'express';

import {
  confirmMembershipPayment,
  createMembershipInvoice,
  createMembershipTier,
  deleteMembershipTier,
  listMembershipTiers,
  submitPaymentProof,
  updateMembershipTier,
} from '../controllers/subscription.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminLevel } from '../middlewares/adminLevel.js';
import { validate } from '../middlewares/validate.js';
import {
  invoiceConfirmationSchema,
  invoiceCreateSchema,
  membershipTierCreateSchema,
  membershipTierUpdateSchema,
  paymentProofSchema,
} from '../validators/subscription.validator.js';

const router = Router();

router.use(requireAuth);

router.get('/tiers', listMembershipTiers);
router.post('/tiers', requireAdminLevel(6), validate(membershipTierCreateSchema), createMembershipTier);
router.patch('/tiers/:id', requireAdminLevel(6), validate(membershipTierUpdateSchema), updateMembershipTier);
router.delete('/tiers/:id', requireAdminLevel(6), validate(membershipTierUpdateSchema), deleteMembershipTier);

router.post('/invoices', validate(invoiceCreateSchema), createMembershipInvoice);
router.patch('/invoices/:id/proof', validate(paymentProofSchema), submitPaymentProof);
router.post(
  '/invoices/:id/confirm',
  requireAdminLevel(3),
  validate(invoiceConfirmationSchema),
  confirmMembershipPayment,
);

export default router;