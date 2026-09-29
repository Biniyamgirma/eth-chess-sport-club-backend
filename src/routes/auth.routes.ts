import { Router } from 'express';

import { linkTelegramAccount, linkTelegramVendorAccount, login, logout, phoneLogin } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
	authLoginSchema,
	authLogoutSchema,
	phoneLoginSchema,
	telegramLinkSchema,
	telegramVendorLinkSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validate(authLoginSchema), login);// works
router.post('/login/phone', validate(phoneLoginSchema), phoneLogin);// works
router.post('/telegram/link', validate(telegramLinkSchema), linkTelegramAccount);
router.post('/telegram/vendor-link', validate(telegramVendorLinkSchema), linkTelegramVendorAccount);
router.post('/logout', validate(authLogoutSchema), logout);

export default router;
