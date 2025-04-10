import { Router } from 'express';
import { googleAuthController } from '../controllers/auth/googleAuthController';
import { validateApiRequest } from '../middleware/security/apiAuth';
import { Request, Response } from 'express';

const router = Router();

// Add logging middleware for auth routes
router.use((req, res, next) => {
    console.log(`Auth module - Route accessed: ${req.method} ${req.path}`);
    console.log(`Auth module - Full URL: ${req.originalUrl}`);
    console.log(`Auth module - Query parameters:`, req.query);
    next();
});

// Public authentication routes
router.get('/google/callback', (req: Request, res: Response) => {
    console.log('Auth module - Google callback endpoint hit with query params:', req.query);
    // Use type assertion to bypass TypeScript strictness
    return googleAuthController.authenticateUser(req as any, res);
});

// Protected auth routes that require authentication
router.get('/google/refresh-token', validateApiRequest, (req: Request, res: Response) => {
    console.log('Auth module - Processing refresh token request for user:', (req as any).user?.user_id);
    return googleAuthController.refreshAccessToken(req as any, res);
});

router.get('/logout', validateApiRequest, (req: Request, res: Response) => {
    console.log('Auth module - Processing logout request for user:', (req as any).user?.user_id);
    return googleAuthController.logout(req as any, res);
});

export default router;