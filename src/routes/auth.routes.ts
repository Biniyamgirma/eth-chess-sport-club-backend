import { Router } from 'express';

import { linkTelegramAccount, login, logout, phoneLogin } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
	authLoginSchema,
	authLogoutSchema,
	phoneLoginSchema,
	telegramLinkSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validate(authLoginSchema), login);
router.post('/login/phone', validate(phoneLoginSchema), phoneLogin);
router.post('/telegram/link', validate(telegramLinkSchema), linkTelegramAccount);
router.post('/logout', validate(authLogoutSchema), logout);

export default router;
