import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';
import { Request, Response } from 'express';

const router = Router();

// Add logging middleware for auth routes
router.use((req, res, next) => {
    console.log(`Auth route accessed: ${req.method} ${req.path}`);
    next();
});

// Public authentication routes
router.get('/google/callback', (req: Request, res: Response) => {
    // Use type assertion to bypass TypeScript strictness
    return googleAuthController.authenticateUser(req as any, res);
});

// Protected auth routes that require authentication
router.get('/google/refresh-token', validateApiRequest, googleAuthController.refreshAccessToken);
router.get('/logout', validateApiRequest, googleAuthController.logout);

export default router; 