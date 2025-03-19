import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';

const router = Router();

router.post('/auth/google/callback', googleAuthController.handleCallback);
router.post('/auth/google/token', validateApiRequest, googleAuthController.exchangeToken);
router.post('/auth/logout', validateApiRequest, googleAuthController.logout);

export default router; 